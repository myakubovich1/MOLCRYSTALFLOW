from dataclasses import dataclass
from pathlib import Path
import random
import sys
from typing import Any

from .v2_features import (
    AuxiliaryFeatures,
    ParsedMolecule,
    V2InputError,
    build_auxiliary_features,
    prepare_molecule,
    serialize_candidate,
)


@dataclass(frozen=True)
class GenerationSummary:
    formula: str
    atom_count: int
    generated_by_z: dict[int, int]
    skipped_by_z: dict[int, int]
    feature_provenance: str
    exact_features: bool


def _ensure_runtime_import_path(runtime_root: Path) -> None:
    runtime_text = str(runtime_root.resolve())
    if runtime_text not in sys.path:
        sys.path.insert(0, runtime_text)


def _resolve_device(torch_module: Any, configured_device: str) -> Any:
    requested = configured_device.strip().lower()
    if requested == "auto":
        requested = "cuda:0" if torch_module.cuda.is_available() else "cpu"
    if requested.startswith("cuda") and not torch_module.cuda.is_available():
        raise RuntimeError(
            f"MOLFLOW_V2_DEVICE={configured_device!r} requires CUDA, but CUDA is unavailable."
        )
    return torch_module.device(requested)


def _repeat_feature(torch_module: Any, vector: Any, count: int, device: Any) -> Any:
    return (
        torch_module.as_tensor(vector, dtype=torch_module.float32, device=device)
        .unsqueeze(0)
        .repeat(count, 1)
    )


def _build_batch(
    *,
    molecule: ParsedMolecule,
    auxiliary: AuxiliaryFeatures,
    z_value: int,
    torch_module: Any,
    data_class: Any,
    batch_class: Any,
    device: Any,
) -> Any:
    atom_count = molecule.atom_count
    local_coordinates = torch_module.as_tensor(
        molecule.local_coordinates,
        dtype=torch_module.float32,
        device=device,
    ).repeat((z_value, 1))
    centered_coordinates = torch_module.as_tensor(
        molecule.centered_coordinates,
        dtype=torch_module.float32,
        device=device,
    ).repeat((z_value, 1))
    atom_types = torch_module.as_tensor(
        molecule.atomic_numbers,
        dtype=torch_module.long,
        device=device,
    ).repeat(z_value)
    bb_num_vec = torch_module.full(
        (z_value,),
        atom_count,
        dtype=torch_module.int32,
        device=device,
    )

    data_fields: dict[str, Any] = {
        "num_nodes": z_value,
        "num_atoms": atom_count * z_value,
        "num_bbs": z_value,
        "rotmats_1": torch_module.eye(
            3, dtype=torch_module.float32, device=device
        ).unsqueeze(0).repeat(z_value, 1, 1),
        "trans_1": torch_module.zeros(
            (z_value, 3), dtype=torch_module.float32, device=device
        ),
        "local_coords": local_coordinates,
        "gt_coords": centered_coordinates,
        "bb_num_vec": bb_num_vec,
        "atom_types": atom_types,
        "lattice_1": torch_module.eye(
            3, dtype=torch_module.float32, device=device
        ).unsqueeze(0),
        "eigenvalues": _repeat_feature(
            torch_module, molecule.eigenvalues, z_value, device
        ),
        "axis_flips": _repeat_feature(
            torch_module, molecule.axis_flips, z_value, device
        ),
        "geometric_features": _repeat_feature(
            torch_module, auxiliary.geometric, z_value, device
        ),
        "basic_features": _repeat_feature(
            torch_module, auxiliary.basic, z_value, device
        ),
    }
    if auxiliary.chemical is not None:
        data_fields["chemical_features"] = _repeat_feature(
            torch_module, auxiliary.chemical, z_value, device
        )

    data = data_class(**data_fields)
    return batch_class.from_data_list([data]).to(device)


def _load_model(
    *,
    runtime_root: Path,
    checkpoint_path: Path,
    config_path: Path,
    device_name: str,
    num_samples: int,
) -> tuple[Any, Any, Any, Any, Any]:
    _ensure_runtime_import_path(runtime_root)

    import torch
    from omegaconf import OmegaConf
    from torch_geometric.data import Batch, Data

    from molcrystalflow.models.molcrystalflow import FlowModule

    torch.set_float32_matmul_precision("high")
    device = _resolve_device(torch, device_name)

    cfg = OmegaConf.load(config_path)
    OmegaConf.set_struct(cfg, False)
    cfg.inference = OmegaConf.create(
        {
            "num_samples": num_samples,
            "save_trajectories": False,
        }
    )
    cfg.experiment.inference_dir = None

    model = FlowModule.load_from_checkpoint(
        checkpoint_path=str(checkpoint_path),
        cfg=cfg,
        map_location="cpu",
        weights_only=False,
    )
    model._inference_cfg = cfg.inference
    model.eval()
    model.to(device)
    return model, torch, Data, Batch, device


def generate_structures(
    *,
    xyz_path: Path,
    output_dir: Path,
    runtime_root: Path,
    checkpoint_path: Path,
    config_path: Path,
    z_values: list[int],
    num_samples: int,
    num_timesteps: int,
    device_name: str,
    feature_mode: str,
    feature_factory: str,
    require_exact_features: bool,
    model_name: str,
    seed: int,
) -> GenerationSummary:
    if num_samples < 1:
        raise ValueError("num_samples must be positive.")
    if num_timesteps < 2:
        raise ValueError("num_timesteps must be at least 2.")
    if not z_values or any(z_value < 1 for z_value in z_values):
        raise ValueError("At least one positive Z value is required.")

    molecule = prepare_molecule(xyz_path)
    auxiliary = build_auxiliary_features(
        molecule,
        mode=feature_mode,
        factory_path=feature_factory,
    )
    if require_exact_features and not auxiliary.exact:
        raise RuntimeError(
            "The backend requires exact lab features, but the configured feature "
            f"pipeline reports provenance={auxiliary.provenance!r}."
        )

    model, torch, data_class, batch_class, device = _load_model(
        runtime_root=runtime_root,
        checkpoint_path=checkpoint_path,
        config_path=config_path,
        device_name=device_name,
        num_samples=num_samples,
    )

    import numpy as np

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    output_dir.mkdir(parents=True, exist_ok=True)
    generated_by_z: dict[int, int] = {}
    skipped_by_z: dict[int, int] = {}
    combined_blocks: list[str] = []

    for z_value in sorted(set(z_values)):
        batch = _build_batch(
            molecule=molecule,
            auxiliary=auxiliary,
            z_value=z_value,
            torch_module=torch,
            data_class=data_class,
            batch_class=batch_class,
            device=device,
        )
        model._inference_cfg.num_samples = num_samples
        with torch.inference_mode():
            results = model(batch, num_timesteps=num_timesteps)

        z_blocks: list[str] = []
        skipped = 0
        for sample_index in range(num_samples):
            coordinates = (
                results["cart_coords"][sample_index]
                .detach()
                .cpu()
                .to(torch.float64)
                .tolist()
            )
            lattice = (
                results["lattices"][sample_index][0]
                .detach()
                .cpu()
                .to(torch.float64)
                .tolist()
            )
            try:
                block = serialize_candidate(
                    symbols=molecule.symbols,
                    coordinates=coordinates,
                    lattice=lattice,
                    z_value=z_value,
                    sample_index=sample_index,
                    model_name=model_name,
                    feature_provenance=auxiliary.provenance,
                )
            except V2InputError as error:
                skipped += 1
                print(
                    f"Skipping invalid generated candidate Z={z_value} "
                    f"sample={sample_index}: {error}",
                    flush=True,
                )
                continue
            z_blocks.append(block)

        if not z_blocks:
            raise RuntimeError(f"MolCrystalFlow v2 produced no valid candidates for Z={z_value}.")
        (output_dir / f"crystals_z{z_value}.xyz").write_text("".join(z_blocks))
        combined_blocks.extend(z_blocks)
        generated_by_z[z_value] = len(z_blocks)
        skipped_by_z[z_value] = skipped

        del batch
        del results
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    (output_dir / "pred_combined.xyz").write_text("".join(combined_blocks))
    return GenerationSummary(
        formula=molecule.formula,
        atom_count=molecule.atom_count,
        generated_by_z=generated_by_z,
        skipped_by_z=skipped_by_z,
        feature_provenance=auxiliary.provenance,
        exact_features=auxiliary.exact,
    )
