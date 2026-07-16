from pathlib import Path
from collections import Counter
import os
import re
import shutil
import subprocess
import sys

from .config import (
    BACKEND_ROOT,
    CKPT_PATH,
    CSP_DIR,
    DEFAULT_NUM_SAMPLES,
    DEFAULT_Z_VALUES,
    GENERATOR_BACKEND,
    GENERATOR_OVERLAP_FILTER_ENABLED,
    JOBS_DIR,
    PYTHONPATH_VALUE,
    V2_CHECKPOINT_PATH,
    V2_CONFIG_PATH,
    V2_DEVICE,
    V2_ALLOW_NEUTRAL_FEATURES,
    V2_FEATURE_FACTORY,
    V2_FEATURE_MODE,
    V2_GPU_LOCK_PATH,
    V2_MODEL_NAME,
    V2_NUM_TIMESTEPS,
    V2_REQUIRE_EXACT_FEATURES,
    V2_RUNTIME_ROOT,
)
from .filtering import process_generated_outputs
from .utils import ensure_dir, write_json


def build_command(job_dir: Path, z_values: list[int], num_samples: int) -> list[str]:
    molecule_path = job_dir / "input" / "molecule.xyz"

    if GENERATOR_BACKEND == "ccdc_v2":
        output_dir = job_dir / "generated"
        seed = int(job_dir.name[:8], 16)
        cmd = [
            sys.executable,
            "-m",
            "app.v2_cli",
            "--xyz",
            str(molecule_path),
            "--output-dir",
            str(output_dir),
            "--runtime-root",
            str(V2_RUNTIME_ROOT),
            "--checkpoint",
            str(V2_CHECKPOINT_PATH),
            "--config",
            str(V2_CONFIG_PATH),
            "--z-values",
            *[str(z) for z in z_values],
            "--num-samples",
            str(num_samples),
            "--num-timesteps",
            str(V2_NUM_TIMESTEPS),
            "--device",
            V2_DEVICE,
            "--feature-mode",
            V2_FEATURE_MODE,
            "--feature-factory",
            V2_FEATURE_FACTORY,
            "--model-name",
            V2_MODEL_NAME,
            "--seed",
            str(seed),
            "--gpu-lock",
            str(V2_GPU_LOCK_PATH),
        ]
        if V2_REQUIRE_EXACT_FEATURES:
            cmd.append("--require-exact-features")
        if V2_ALLOW_NEUTRAL_FEATURES:
            cmd.append("--allow-neutral-features")
        return cmd

    cmd = [
        sys.executable,
        "csp_pipeline.py",
        "--xyz",
        str(molecule_path),
        "--ckpt_path",
        str(CKPT_PATH),
        "--z_values",
        *[str(z) for z in z_values],
        "--num_samples",
        str(num_samples),
        "--generate",
    ]
    if not GENERATOR_OVERLAP_FILTER_ENABLED:
        cmd.insert(-1, "--no_filter_overlap")
    return cmd


def generator_working_directory() -> Path:
    return BACKEND_ROOT if GENERATOR_BACKEND == "ccdc_v2" else CSP_DIR


def parse_formula_from_log(log_text: str) -> str | None:
    m = re.search(r"Formula:\s*([A-Za-z0-9]+)", log_text)
    return m.group(1) if m else None


def parse_atom_count_from_log(log_text: str) -> int | None:
    m = re.search(r"Loaded molecule with\s+(\d+)\s+atoms", log_text)
    return int(m.group(1)) if m else None


def parse_xyz_symbols(molecule_path: Path) -> list[str]:
    if not molecule_path.exists():
        return []

    lines = molecule_path.read_text(errors="ignore").splitlines()
    atom_lines = lines[2:] if len(lines) >= 2 else lines
    symbols = []

    for line in atom_lines:
        parts = line.split()
        if not parts:
            continue

        symbol = parts[0].strip()
        if re.fullmatch(r"[A-Z][a-z]?", symbol):
            symbols.append(symbol)

    return symbols


def infer_formula_from_xyz(molecule_path: Path) -> str | None:
    counts = Counter(parse_xyz_symbols(molecule_path))
    if not counts:
        return None

    ordered_symbols = []
    if "C" in counts:
        ordered_symbols.append("C")
    if "H" in counts:
        ordered_symbols.append("H")
    ordered_symbols.extend(sorted(symbol for symbol in counts if symbol not in {"C", "H"}))

    return "".join(
        f"{symbol}{counts[symbol] if counts[symbol] > 1 else ''}"
        for symbol in ordered_symbols
    )


def infer_atom_count_from_xyz(molecule_path: Path) -> int | None:
    symbols = parse_xyz_symbols(molecule_path)
    return len(symbols) if symbols else None


def collect_outputs(
    generated_dir: Path,
    artifacts_dir: Path,
    atom_count: int | None,
    z_values: list[int],
    filtering_options: dict,
    generation_seed: int | None = None,
) -> tuple[list[dict], dict | None]:
    ensure_dir(artifacts_dir)

    if not atom_count:
        return [], None

    if not generated_dir.exists():
        return [], None

    return process_generated_outputs(
        generated_dir=generated_dir,
        artifacts_dir=artifacts_dir,
        input_atom_count=atom_count,
        z_values=z_values,
        options=filtering_options,
        generation_seed=generation_seed,
    )


def run_job(
    job_id: str,
    z_values: list[int] | None = None,
    num_samples: int | None = None,
    filtering_options: dict | None = None,
) -> None:
    z_values   = z_values   if z_values   is not None else DEFAULT_Z_VALUES
    num_samples = num_samples if num_samples is not None else DEFAULT_NUM_SAMPLES
    filtering_options = filtering_options or {
        "geometryEnabled": True,
        "clashThresholdRatio": 0.65,
        "maxClashCount": 0,
        "energyEnabled": False,
        "relaxationSteps": 0,
        "relaxationFmaxEvPerAngstrom": 0.2,
    }
    generation_seed = int(job_id[:8], 16)

    job_dir = JOBS_DIR / job_id
    input_dir = job_dir / "input"
    run_dir = job_dir / "run"
    artifacts_dir = job_dir / "artifacts"
    generated_dir = job_dir / "generated"
    ensure_dir(input_dir)
    ensure_dir(run_dir)
    ensure_dir(artifacts_dir)

    molecule_path = input_dir / "molecule.xyz"
    status_path = run_dir / "status.json"
    log_path = run_dir / "run.log"

    status = {
        "jobId": job_id,
        "status": "running",
        "formula": None,
        "atomCount": None,
        "zValues": z_values,
        "candidateCount": None,
        "generatedCandidateCount": None,
        "filterSummary": None,
        "artifacts": [],
        "error": None,
        "generatorBackend": GENERATOR_BACKEND,
        "modelVersion": V2_MODEL_NAME if GENERATOR_BACKEND == "ccdc_v2" else "omc25-legacy",
        "featureMode": V2_FEATURE_MODE if GENERATOR_BACKEND == "ccdc_v2" else "legacy",
        "generationSeed": generation_seed,
    }
    write_json(status_path, status)

    env = os.environ.copy()
    env["PYTHONPATH"] = PYTHONPATH_VALUE

    cmd = build_command(job_dir, z_values, num_samples)
    working_directory = generator_working_directory()

    with log_path.open("w") as log_file:
        log_file.write(f"Starting MolCrystalFlow command: {' '.join(cmd)}\n")
        log_file.write(f"Generator backend: {GENERATOR_BACKEND}\n")
        log_file.write(f"Working directory: {working_directory}\n\n")
        log_file.flush()

        if not working_directory.is_dir():
            status.update(
                {
                    "status": "failed",
                    "error": (
                        "Generator working directory does not exist or is not a directory: "
                        f"{working_directory}"
                    ),
                }
            )
            write_json(status_path, status)
            return

        configured_checkpoint = (
            V2_CHECKPOINT_PATH if GENERATOR_BACKEND == "ccdc_v2" else CKPT_PATH
        )
        if not configured_checkpoint.is_file():
            status.update(
                {
                    "status": "failed",
                    "error": (
                        "Configured checkpoint does not exist or is not a file: "
                        f"{configured_checkpoint}"
                    ),
                }
            )
            write_json(status_path, status)
            return

        proc = subprocess.run(
            cmd,
            cwd=str(working_directory),
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
            env=env,
        )

    log_text = log_path.read_text(errors="ignore")
    formula = parse_formula_from_log(log_text) or infer_formula_from_xyz(molecule_path)
    atom_count = parse_atom_count_from_log(log_text) or infer_atom_count_from_xyz(molecule_path)

    if proc.returncode != 0:
        status.update(
            {
                "status": "failed",
                "formula": formula,
                "atomCount": atom_count,
                "error": "MolCrystalFlow run failed. Check run.log.",
            }
        )
        write_json(status_path, status)
        return

    if GENERATOR_BACKEND == "legacy" and formula:
        source_formula_dir = CSP_DIR / formula
        target_formula_dir = job_dir / formula
        if source_formula_dir.exists():
            if target_formula_dir.exists():
                shutil.rmtree(target_formula_dir)
            shutil.copytree(source_formula_dir, target_formula_dir)
        generated_dir = target_formula_dir / "generated"

    try:
        artifacts, filter_summary = collect_outputs(
            generated_dir,
            artifacts_dir,
            atom_count,
            z_values,
            filtering_options,
            generation_seed,
        )
    except Exception as error:
        artifacts = [
            {"name": path.name, "sizeBytes": path.stat().st_size}
            for path in sorted((job_dir / "artifacts").glob("*"))
            if path.is_file()
        ]
        status.update(
            {
                "status": "failed",
                "formula": formula,
                "atomCount": atom_count,
                "candidateCount": None,
                "artifacts": artifacts,
                "error": f"Candidate filtering failed: {error}",
            }
        )
        write_json(status_path, status)
        return

    if not artifacts:
        status.update(
            {
                "status": "failed",
                "formula": formula,
                "atomCount": atom_count,
                "candidateCount": None,
                "generatedCandidateCount": None,
                "filterSummary": None,
                "artifacts": [],
                "error": "MolCrystalFlow finished but no XYZ artifacts were found.",
            }
        )
        write_json(status_path, status)
        return

    status.update(
        {
            "status": "completed",
            "formula": formula,
            "atomCount": atom_count,
            "candidateCount": filter_summary["acceptedCount"] if filter_summary else None,
            "generatedCandidateCount": filter_summary["generatedCount"] if filter_summary else None,
            "filterSummary": filter_summary,
            "artifacts": artifacts,
            "error": None,
        }
    )
    write_json(status_path, status)
