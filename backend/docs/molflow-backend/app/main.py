import json
import os
import subprocess
import sys

from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import (
    API_TOKEN,
    DEFAULT_Z_VALUES,
    GENERATOR_BACKEND,
    JOBS_DIR,
    SUPPORTED_Z_VALUES,
    V2_FEATURE_MODE,
    V2_MODEL_NAME,
    backend_capabilities,
    runtime_config_errors,
)
from .models import JobCreateRequest, JobStatusResponse, ArtifactInfo
from .utils import ensure_dir, new_job_id, read_json, tail_text, write_json

ALLOWED_Z_VALUES = set(SUPPORTED_Z_VALUES)

app = FastAPI(title="MolFlow Desktop Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_dir(JOBS_DIR)


def check_token(auth_header: str | None) -> None:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth_header.split(" ", 1)[1]
    if token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")


def check_runtime_config() -> None:
    errors = runtime_config_errors()
    if errors:
        raise HTTPException(
            status_code=503,
            detail="Backend runtime is not configured correctly: " + "; ".join(errors),
        )


def normalize_z_values(raw_z_values: list[int]) -> list[int]:
    z_values = sorted(set(raw_z_values)) if raw_z_values else list(DEFAULT_Z_VALUES)
    unsupported = [value for value in z_values if value not in ALLOWED_Z_VALUES]

    if unsupported:
        allowed = ", ".join(str(value) for value in sorted(ALLOWED_Z_VALUES))
        rejected = ", ".join(str(value) for value in unsupported)
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported zValues: {rejected}. Allowed values are: {allowed}.",
        )

    return z_values


def build_worker_script(
    job_id: str,
    z_values: list[int],
    num_samples: int,
    filtering_options: dict,
) -> str:
    return f"""
import traceback

job_id = {json.dumps(job_id)}
z_values = {json.dumps(z_values)}
num_samples = {json.dumps(num_samples)}
filtering_options = {filtering_options!r}

try:
    from app.runner import run_job
    run_job(job_id, z_values, num_samples, filtering_options)
except Exception as exc:
    try:
        from app.config import JOBS_DIR
        from app.utils import ensure_dir, read_json, write_json

        job_dir = JOBS_DIR / job_id
        run_dir = job_dir / "run"
        ensure_dir(run_dir)

        log_path = run_dir / "run.log"
        with log_path.open("a") as log_file:
            log_file.write("\\nBackend worker failed before completing run_job().\\n")
            traceback.print_exc(file=log_file)

        status_path = run_dir / "status.json"
        if status_path.exists():
            status = read_json(status_path)
        else:
            status = {{"jobId": job_id, "zValues": z_values, "artifacts": []}}

        status.update({{
            "status": "failed",
            "candidateCount": status.get("candidateCount"),
            "generatedCandidateCount": status.get("generatedCandidateCount"),
            "filterSummary": status.get("filterSummary"),
            "artifacts": status.get("artifacts", []),
            "error": f"Backend worker failed: {{exc}}",
        }})
        write_json(status_path, status)
    except Exception:
        traceback.print_exc()
    raise
"""


def mark_startup_failed(job_id: str, z_values: list[int], error: Exception) -> None:
    run_dir = JOBS_DIR / job_id / "run"
    ensure_dir(run_dir)
    message = f"Backend worker could not start: {error}"
    (run_dir / "run.log").write_text(message + "\n")
    write_json(
        run_dir / "status.json",
        {
            "jobId": job_id,
            "status": "failed",
            "formula": None,
            "atomCount": None,
            "zValues": z_values,
            "candidateCount": None,
            "generatedCandidateCount": None,
            "filterSummary": None,
            "artifacts": [],
            "generatorBackend": GENERATOR_BACKEND,
            "modelVersion": V2_MODEL_NAME if GENERATOR_BACKEND == "ccdc_v2" else "omc25-legacy",
            "featureMode": V2_FEATURE_MODE if GENERATOR_BACKEND == "ccdc_v2" else "legacy",
            "error": message,
        },
    )


@app.get("/health")
def health(authorization: str | None = Header(default=None)):
    check_token(authorization)
    check_runtime_config()
    return {"detail": "ok", "capabilities": backend_capabilities()}


@app.post("/jobs", response_model=JobStatusResponse)
def create_job(payload: JobCreateRequest, authorization: str | None = Header(default=None)):
    check_token(authorization)
    check_runtime_config()

    z_values = normalize_z_values(payload.zValues)
    num_samples = payload.numSamples
    filtering_options = payload.filtering.model_dump()

    job_id = new_job_id()
    generation_seed = int(job_id[:8], 16)
    job_dir = JOBS_DIR / job_id
    input_dir = job_dir / "input"
    run_dir = job_dir / "run"
    artifacts_dir = job_dir / "artifacts"

    ensure_dir(input_dir)
    ensure_dir(run_dir)
    ensure_dir(artifacts_dir)

    (input_dir / "molecule.xyz").write_text(payload.xyzText)

    meta = {
        "jobId": job_id,
        "originalFilename": payload.originalFilename,
        "inputMode": payload.inputMode,
        "filtering": filtering_options,
        "generatorBackend": GENERATOR_BACKEND,
        "modelVersion": V2_MODEL_NAME if GENERATOR_BACKEND == "ccdc_v2" else "omc25-legacy",
        "featureMode": V2_FEATURE_MODE if GENERATOR_BACKEND == "ccdc_v2" else "legacy",
        "generationSeed": generation_seed,
    }
    write_json(run_dir / "meta.json", meta)
    write_json(
        run_dir / "status.json",
        {
            "jobId": job_id,
            "status": "queued",
            "formula": None,
            "atomCount": None,
            "zValues": z_values,
            "candidateCount": None,
            "generatedCandidateCount": None,
            "filterSummary": None,
            "artifacts": [],
            "generatorBackend": meta["generatorBackend"],
            "modelVersion": meta["modelVersion"],
            "featureMode": meta["featureMode"],
            "generationSeed": generation_seed,
            "error": None,
        },
    )

    bootstrap_log = run_dir / "bootstrap.log"
    startup_error = None
    try:
        with bootstrap_log.open("ab") as log_file:
            subprocess.Popen(
                [
                    sys.executable,
                    "-c",
                    build_worker_script(job_id, z_values, num_samples, filtering_options),
                ],
                cwd=str(JOBS_DIR.parent),
                stdout=log_file,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
    except OSError as error:
        startup_error = str(error)
        mark_startup_failed(job_id, z_values, error)

    return JobStatusResponse(
        jobId=job_id,
        status="failed" if startup_error else "queued",
        originalFilename=payload.originalFilename,
        zValues=z_values,
        generatedCandidateCount=None,
        filterSummary=None,
        artifacts=[],
        generatorBackend=meta["generatorBackend"],
        modelVersion=meta["modelVersion"],
        featureMode=meta["featureMode"],
        generationSeed=generation_seed,
        error=startup_error,
    )


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str, authorization: str | None = Header(default=None)):
    check_token(authorization)

    job_dir = JOBS_DIR / job_id
    status_path = job_dir / "run" / "status.json"
    meta_path = job_dir / "run" / "meta.json"
    log_path = job_dir / "run" / "run.log"
    bootstrap_log_path = job_dir / "run" / "bootstrap.log"

    if not status_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")

    status = read_json(status_path)
    meta = read_json(meta_path) if meta_path.exists() else {}

    artifacts = []
    for item in status.get("artifacts", []):
        artifacts.append(
            ArtifactInfo(
                name=item["name"],
                sizeBytes=item.get("sizeBytes", item.get("size", 0)),
                url=f"/jobs/{job_id}/files/{item['name']}",
            )
        )

    log_tail = tail_text(log_path)
    if not log_tail:
        log_tail = tail_text(bootstrap_log_path)

    return JobStatusResponse(
        jobId=job_id,
        status=status["status"],
        originalFilename=meta.get("originalFilename"),
        formula=status.get("formula"),
        atomCount=status.get("atomCount"),
        zValues=status.get("zValues", []),
        candidateCount=status.get("candidateCount"),
        generatedCandidateCount=status.get("generatedCandidateCount"),
        filterSummary=status.get("filterSummary"),
        artifacts=artifacts,
        logTail=log_tail,
        generatorBackend=status.get("generatorBackend", meta.get("generatorBackend")),
        modelVersion=status.get("modelVersion", meta.get("modelVersion")),
        featureMode=status.get("featureMode", meta.get("featureMode")),
        generationSeed=status.get("generationSeed", meta.get("generationSeed")),
        error=status.get("error"),
    )


@app.get("/jobs/{job_id}/files/{name}")
def get_job_file(job_id: str, name: str, authorization: str | None = Header(default=None)):
    check_token(authorization)

    safe_name = os.path.basename(name)
    file_path = JOBS_DIR / job_id / "artifacts" / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(str(file_path), filename=safe_name)


@app.get("/jobs/{job_id}/log")
def get_job_log(job_id: str, authorization: str | None = Header(default=None)):
    check_token(authorization)
    log_path = JOBS_DIR / job_id / "run" / "run.log"
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="Log not found")
    return PlainTextResponse(log_path.read_text(errors="ignore"))
