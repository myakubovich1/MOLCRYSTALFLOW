from pathlib import Path
import shutil

from app.config import (
    BACKEND_ROOT,
    V2_CHECKPOINT_PATH,
    V2_CONFIG_PATH,
    V2_DEVICE,
    V2_FEATURE_FACTORY,
    V2_FEATURE_MODE,
    V2_MODEL_NAME,
    V2_NUM_TIMESTEPS,
    V2_REQUIRE_EXACT_FEATURES,
    V2_RUNTIME_ROOT,
)
from app.filtering import split_multi_xyz
from app.v2_generator import generate_structures


def main() -> None:
    output_dir = BACKEND_ROOT / "smoke-output"
    if output_dir.exists():
        shutil.rmtree(output_dir)

    summary = generate_structures(
        xyz_path=BACKEND_ROOT / "examples" / "cytosine.xyz",
        output_dir=output_dir,
        runtime_root=V2_RUNTIME_ROOT,
        checkpoint_path=V2_CHECKPOINT_PATH,
        config_path=V2_CONFIG_PATH,
        z_values=[2],
        num_samples=1,
        num_timesteps=V2_NUM_TIMESTEPS,
        device_name=V2_DEVICE,
        feature_mode=V2_FEATURE_MODE,
        feature_factory=V2_FEATURE_FACTORY,
        require_exact_features=V2_REQUIRE_EXACT_FEATURES,
        model_name=V2_MODEL_NAME,
        seed=123,
    )

    candidate_path = output_dir / "crystals_z2.xyz"
    candidates = split_multi_xyz(candidate_path.read_text())
    if len(candidates) != 1:
        raise RuntimeError(
            f"Expected one smoke-test candidate, found {len(candidates)}."
        )

    print("MolCrystalFlow v2 smoke test passed.")
    print(f"Output: {candidate_path}")
    print(f"Summary: {summary}")


if __name__ == "__main__":
    main()
