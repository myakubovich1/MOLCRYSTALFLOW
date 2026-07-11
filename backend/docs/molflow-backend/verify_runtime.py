from pathlib import Path
import hashlib
import sys

from app.config import (
    GENERATOR_BACKEND,
    POTENTIAL_PROVIDER,
    RIGID_BODY_STEPS,
    UMA_MODEL,
    V2_CHECKPOINT_PATH,
    V2_CONFIG_PATH,
    V2_FEATURE_MODE,
    V2_MODEL_NAME,
    V2_RUNTIME_ROOT,
    potential_config_errors,
    rigid_body_config_errors,
    runtime_config_errors,
)


EXPECTED_BEST_CHECKPOINT_SHA256 = (
    "cf841452a9eb9bc2300e760ef5fe072337167e8fcd87adf91408804c60b873bf"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as input_file:
        for chunk in iter(lambda: input_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    errors = runtime_config_errors()
    if errors:
        print("MolFlow backend runtime verification failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"Generator backend: {GENERATOR_BACKEND}")
    if GENERATOR_BACKEND == "ccdc_v2":
        print(f"Model version: {V2_MODEL_NAME}")
        print(f"Runtime root: {V2_RUNTIME_ROOT}")
        print(f"Checkpoint: {V2_CHECKPOINT_PATH}")
        print(f"Checkpoint config: {V2_CONFIG_PATH}")
        print(f"Feature mode: {V2_FEATURE_MODE}")
        checkpoint_hash = sha256(V2_CHECKPOINT_PATH)
        print(f"Checkpoint SHA256: {checkpoint_hash}")
        if (
            V2_CHECKPOINT_PATH.name == "best.ckpt"
            and checkpoint_hash != EXPECTED_BEST_CHECKPOINT_SHA256
        ):
            print(
                "Checkpoint hash does not match the bundled epoch-436 checkpoint.",
                file=sys.stderr,
            )
            return 1
    potential_errors = potential_config_errors()
    rigid_body_errors = rigid_body_config_errors() if POTENTIAL_PROVIDER == "uma" else []
    print(f"Potential provider: {POTENTIAL_PROVIDER}")
    if POTENTIAL_PROVIDER == "uma":
        print(f"Potential model: {UMA_MODEL}")
        print(f"Rigid-body steps: {RIGID_BODY_STEPS}")
    if potential_errors or rigid_body_errors:
        print("Energy ranking unavailable:")
        for error in [*potential_errors, *rigid_body_errors]:
            print(f"  - {error}")
    else:
        print("Energy ranking: available")
    print("MolFlow backend runtime verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
