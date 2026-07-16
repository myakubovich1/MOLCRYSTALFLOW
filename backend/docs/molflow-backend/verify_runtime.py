from pathlib import Path
import hashlib
import sys

from app.config import (
    BACKEND_ROOT,
    GENERATOR_BACKEND,
    POTENTIAL_PROVIDER,
    RIGID_BODY_STEPS,
    UMA_MODEL,
    UMA_TASK_NAME,
    V2_CHECKPOINT_PATH,
    V2_CONFIG_PATH,
    V2_FEATURE_FACTORY,
    V2_FEATURE_MODE,
    V2_MODEL_NAME,
    V2_REQUIRE_EXACT_FEATURES,
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
        try:
            from app.v2_features import build_auxiliary_features, prepare_molecule

            verification_molecule = prepare_molecule(
                BACKEND_ROOT / "examples" / "cytosine.xyz"
            )
            verification_features = build_auxiliary_features(
                verification_molecule,
                mode=V2_FEATURE_MODE,
                factory_path=V2_FEATURE_FACTORY,
            )
        except Exception as error:
            print(f"CCDC-v2 feature verification failed: {error}", file=sys.stderr)
            return 1
        if V2_REQUIRE_EXACT_FEATURES and not verification_features.exact:
            print(
                "CCDC-v2 exact features are required, but the configured feature "
                "implementation reports an approximation.",
                file=sys.stderr,
            )
            return 1
        print(f"Feature provenance: {verification_features.provenance}")
        print(f"Feature dimensions: geometric={verification_features.geometric.shape[0]}, "
              f"basic={verification_features.basic.shape[0]}")
        print(f"Feature payload complete: {verification_features.complete}")
        print(f"Exact training parity: {verification_features.exact}")
        for limitation in verification_features.limitations:
            print(f"Feature limitation: {limitation}")
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
    if POTENTIAL_PROVIDER == "uma" and (
        UMA_MODEL != "uma-s-1p2"
        or UMA_TASK_NAME != "omc"
        or RIGID_BODY_STEPS != 10
    ):
        print("MolFlow scientific ranking configuration is invalid:")
        print("  - UMA molecular-crystal ranking requires model uma-s-1p2.")
        print("  - UMA molecular-crystal ranking requires task omc.")
        print("  - Rigid-body optimization requires exactly 10 steps.")
        return 1
    potential_errors = potential_config_errors()
    rigid_body_errors = rigid_body_config_errors() if POTENTIAL_PROVIDER == "uma" else []
    print(f"Potential provider: {POTENTIAL_PROVIDER}")
    if POTENTIAL_PROVIDER == "uma":
        print(f"Potential model: {UMA_MODEL}")
        print(f"Potential task: {UMA_TASK_NAME}")
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
