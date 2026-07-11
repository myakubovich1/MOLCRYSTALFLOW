from pathlib import Path
import json
import time
import uuid


def new_job_id() -> str:
    return uuid.uuid4().hex


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, data: dict) -> None:
    ensure_dir(path.parent)
    tmp_path = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    tmp_path.write_text(json.dumps(data, indent=2))
    tmp_path.replace(path)


def read_json(path: Path) -> dict:
    last_error: Exception | None = None

    for _ in range(5):
        try:
            text = path.read_text()
            if not text.strip():
                raise json.JSONDecodeError("Empty JSON file", text, 0)
            return json.loads(text)
        except json.JSONDecodeError as error:
            last_error = error
            time.sleep(0.05)

    raise ValueError(f"Could not read valid JSON from {path}") from last_error


def tail_text(path: Path, n: int = 60) -> list[str]:
    if not path.exists():
        return []
    lines = path.read_text(errors="ignore").splitlines()
    return lines[-n:]
