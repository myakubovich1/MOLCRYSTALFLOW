import argparse
import fcntl
from pathlib import Path

from .v2_generator import generate_structures


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate crystal candidates with the bundled CCDC MolCrystalFlow v2 model."
    )
    parser.add_argument("--xyz", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--runtime-root", required=True, type=Path)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--z-values", required=True, nargs="+", type=int)
    parser.add_argument("--num-samples", required=True, type=int)
    parser.add_argument("--num-timesteps", required=True, type=int)
    parser.add_argument("--device", required=True)
    parser.add_argument("--feature-mode", required=True, choices=["neutral", "factory"])
    parser.add_argument("--feature-factory", default="")
    parser.add_argument("--require-exact-features", action="store_true")
    parser.add_argument("--model-name", required=True)
    parser.add_argument("--seed", required=True, type=int)
    parser.add_argument("--gpu-lock", required=True, type=Path)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.gpu_lock.parent.mkdir(parents=True, exist_ok=True)

    print(f"Waiting for model execution lock: {args.gpu_lock}", flush=True)
    with args.gpu_lock.open("w") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        print("Acquired model execution lock.", flush=True)
        summary = generate_structures(
            xyz_path=args.xyz,
            output_dir=args.output_dir,
            runtime_root=args.runtime_root,
            checkpoint_path=args.checkpoint,
            config_path=args.config,
            z_values=args.z_values,
            num_samples=args.num_samples,
            num_timesteps=args.num_timesteps,
            device_name=args.device,
            feature_mode=args.feature_mode,
            feature_factory=args.feature_factory,
            require_exact_features=args.require_exact_features,
            model_name=args.model_name,
            seed=args.seed,
        )

    print(f"Formula: {summary.formula}", flush=True)
    print(f"Loaded molecule with {summary.atom_count} atoms", flush=True)
    print(f"Generated candidates by Z: {summary.generated_by_z}", flush=True)
    print(f"Skipped invalid candidates by Z: {summary.skipped_by_z}", flush=True)
    print(f"Feature provenance: {summary.feature_provenance}", flush=True)
    print(f"Exact training features: {summary.exact_features}", flush=True)


if __name__ == "__main__":
    main()
