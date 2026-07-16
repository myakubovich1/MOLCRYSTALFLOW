"""Run a multi-sample CCDC-v2, filtering, optimization, and UMA validation job."""

import argparse
from datetime import datetime, timezone
import json
from math import isfinite
from pathlib import Path
import subprocess
import sys

from app.config import (
    BACKEND_ROOT,
    V2_ALLOW_NEUTRAL_FEATURES,
    V2_CHECKPOINT_PATH,
    V2_CONFIG_PATH,
    V2_DEVICE,
    V2_FEATURE_FACTORY,
    V2_FEATURE_MODE,
    V2_GPU_LOCK_PATH,
    V2_MODEL_NAME,
    V2_NUM_TIMESTEPS,
    V2_REQUIRE_EXACT_FEATURES,
    V2_RUNTIME_ROOT,
)
from app.filtering import process_generated_outputs


def validation_failures(
    summary: dict,
    manifest: dict,
    *,
    expected_count: int,
) -> list[str]:
    failures: list[str] = []
    if summary.get("generatedCount") != expected_count:
        failures.append(
            f"generated {summary.get('generatedCount')} candidates; expected {expected_count}"
        )
    if not summary.get("generatorInputComplete"):
        failures.append("generator input descriptors were incomplete")
    if summary.get("generatorFeatureMode") != "inference_kit":
        failures.append(
            "generator feature mode was not the lab inference-kit implementation"
        )
    if summary.get("preOptimizationGeometryPassedCount", 0) == 0:
        failures.append("no generated candidate passed pre-optimization geometry screening")
    if summary.get("potentialFailedCount", 0) > 0:
        failures.append(
            f"{summary['potentialFailedCount']} potential evaluations failed"
        )
    if not summary.get("energyRankingAvailable"):
        failures.append(
            "UMA energy ranking was unavailable: "
            f"{summary.get('energyRankingUnavailableReason') or 'no reason reported'}"
        )
    if summary.get("potentialProvider") != "uma":
        failures.append("potential provider was not UMA")
    if summary.get("potentialModel") != "uma-s-1p2":
        failures.append("potential model was not uma-s-1p2")
    if summary.get("potentialTask") != "omc":
        failures.append("UMA task was not omc")
    if summary.get("rigidBodySteps") != 10:
        failures.append("rigid-body optimization was not configured for 10 steps")
    if summary.get("energyRankedCount", 0) == 0:
        failures.append("no candidate received a UMA energy rank")
    if summary.get("acceptedCount", 0) == 0:
        failures.append("no candidate passed the complete workflow")

    if manifest.get("schemaVersion") != 2:
        failures.append("candidate manifest does not use schema version 2")
    manifest_candidates = manifest.get("candidates")
    if not isinstance(manifest_candidates, list):
        failures.append("candidate manifest does not contain a candidate list")
        return failures

    ranked = [
        candidate
        for candidate in manifest_candidates
        if candidate.get("rankingStatus") == "ranked"
    ]
    if len(ranked) != summary.get("energyRankedCount"):
        failures.append(
            "candidate manifest rank count does not match the filtering summary"
        )
    try:
        ranked.sort(key=lambda candidate: int(candidate["rank"]))
    except (KeyError, TypeError, ValueError):
        failures.append("one or more ranked candidates has an invalid rank")
        return failures

    expected_ranks = list(range(1, len(ranked) + 1))
    actual_ranks = [int(candidate["rank"]) for candidate in ranked]
    if actual_ranks != expected_ranks:
        failures.append("candidate ranks are not contiguous starting at one")

    energies: list[float] = []
    for candidate in ranked:
        candidate_id = candidate.get("id", "unknown")
        try:
            energy = float(candidate["energy"])
        except (KeyError, TypeError, ValueError):
            failures.append(f"ranked candidate {candidate_id} has no numeric energy")
            continue
        if not isfinite(energy):
            failures.append(f"ranked candidate {candidate_id} has a non-finite energy")
        energies.append(energy)

        expected_metadata = {
            "energyUnits": "eV/molecule",
            "optimized": True,
            "optimizationType": "rigid-body",
            "optimizationSteps": 10,
            "potentialProvider": "uma",
            "potentialModel": "uma-s-1p2",
            "potentialTask": "omc",
            "accepted": True,
        }
        for field, expected_value in expected_metadata.items():
            if candidate.get(field) != expected_value:
                failures.append(
                    f"ranked candidate {candidate_id} has {field}={candidate.get(field)!r}; "
                    f"expected {expected_value!r}"
                )
        post_geometry = candidate.get("postOptimizationGeometry")
        if not isinstance(post_geometry, dict) or not post_geometry.get("geometryPassed"):
            failures.append(
                f"ranked candidate {candidate_id} lacks a passing post-optimization geometry record"
            )

    if any(right + 1e-10 < left for left, right in zip(energies, energies[1:])):
        failures.append("candidate energies are not nondecreasing in rank order")
    if ranked:
        try:
            first_relative_energy = float(ranked[0]["relativeEnergyEvPerMolecule"])
        except (KeyError, TypeError, ValueError):
            failures.append("rank-one candidate has no numeric relative energy")
        else:
            if abs(first_relative_energy) > 1e-8:
                failures.append("rank-one candidate does not have zero relative energy")
    return failures


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--xyz",
        type=Path,
        default=BACKEND_ROOT / "examples" / "cytosine.xyz",
    )
    parser.add_argument("--z-values", nargs="+", type=int, default=[2, 4])
    parser.add_argument("--num-samples", type=int, default=10)
    parser.add_argument("--seed", type=int, default=123)
    parser.add_argument("--output-root", type=Path)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.num_samples < 1:
        raise SystemExit("--num-samples must be positive.")
    if any(z_value < 1 for z_value in args.z_values):
        raise SystemExit("--z-values must contain positive integers.")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_root = (
        args.output_root
        if args.output_root is not None
        else BACKEND_ROOT / "validation-output" / timestamp
    ).resolve()
    if output_root.exists():
        raise SystemExit(f"Validation output already exists: {output_root}")

    generated_dir = output_root / "generated"
    artifacts_dir = output_root / "artifacts"
    generated_dir.mkdir(parents=True)
    artifacts_dir.mkdir(parents=True)

    command = [
        sys.executable,
        "-m",
        "app.v2_cli",
        "--xyz",
        str(args.xyz.resolve()),
        "--output-dir",
        str(generated_dir),
        "--runtime-root",
        str(V2_RUNTIME_ROOT),
        "--checkpoint",
        str(V2_CHECKPOINT_PATH),
        "--config",
        str(V2_CONFIG_PATH),
        "--z-values",
        *[str(value) for value in args.z_values],
        "--num-samples",
        str(args.num_samples),
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
        str(args.seed),
        "--gpu-lock",
        str(V2_GPU_LOCK_PATH),
    ]
    if V2_REQUIRE_EXACT_FEATURES:
        command.append("--require-exact-features")
    if V2_ALLOW_NEUTRAL_FEATURES:
        command.append("--allow-neutral-features")

    print("Running generator validation:")
    print(" ".join(command))
    subprocess.run(command, cwd=BACKEND_ROOT, check=True)

    atom_count = int(args.xyz.read_text().splitlines()[0].strip())
    _, summary = process_generated_outputs(
        generated_dir=generated_dir,
        artifacts_dir=artifacts_dir,
        input_atom_count=atom_count,
        z_values=args.z_values,
        options={
            "geometryEnabled": True,
            "clashThresholdRatio": 0.65,
            "maxClashCount": 0,
            "minDensityGcm3": None,
            "maxDensityGcm3": None,
            "energyEnabled": False,
            "maxRelativeEnergyEvPerMolecule": None,
            "relaxationSteps": 0,
            "relaxationFmaxEvPerAngstrom": 0.2,
            "maxForceEvPerAngstrom": None,
        },
        generation_seed=args.seed,
    )
    if summary is None:
        raise RuntimeError("Validation produced no filtering summary.")

    summary_path = output_root / "validation-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    print(f"Validation output: {output_root}")

    expected_count = len(set(args.z_values)) * args.num_samples
    manifest = json.loads((artifacts_dir / "candidates.json").read_text())
    failures = validation_failures(
        summary,
        manifest,
        expected_count=expected_count,
    )

    if failures:
        print("End-to-end validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1

    print("End-to-end validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
