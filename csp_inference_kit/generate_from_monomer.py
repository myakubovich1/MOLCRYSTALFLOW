#!/usr/bin/env python
"""
End-to-end crystal structure prediction (CSP): monomer conformer + Z -> trained-model input.

This is CSP, not de novo molecular generation -- the molecule (monomer
conformer) is given and fixed; only its packing/arrangement into a crystal
lattice is predicted (matches the checkpoint config's `data.task:
molcrystal_csp`).

Given only an isolated monomer conformer (xyz/extxyz/sdf) and the number of
molecules per unit cell (Z), builds a single-structure entry in the exact
`*_molcrystal_normalized.pkl.gz` schema that MCDataset expects, so it can be
fed straight into molcrystalflow.experiments.inference for sampling with a
trained checkpoint (e.g. epoch_436-*.ckpt).

What this script does NOT need: bonds, SMILES, RDKit, Open Babel, or the CSD
Python API. The bb_embedder only consumes atomic numbers + 3D positions
(distance-cutoff EGNN), and the epoch_436 checkpoint's node_extra_dim=13 =
bb_num(1) + eigenvalues(3) + geometric_features(7) + basic_features(2) -- no
chemical features are used, so nothing chirality/bond-order dependent is
required.

trans_1, lattice_1 (values), and gt_coords are written as PLACEHOLDERS
(correct shape, arbitrary values). They are only read at training time
(FlowModule.model_step) to compute supervised losses; the sampling path
(FlowModule.forward, used for trainer.predict) draws its own noise from the
prior (trans_0/rotmats_0/lattice_0) and never touches these placeholder
values (only batch['lattice_1'].shape[0], for batch size).

rotmats_1 the *field* is also placeholder in that sense -- but note the same
underlying rotation matrix it stores also defines local_coords (via
preprocess_structure's get_equivariant_axes), which is NOT a placeholder:
local_coords and axis_flips are real, actively-used model inputs derived
entirely from your conformer's own shape (plus mirror_indices below), fed to
the network at every layer of every sampling timestep.

Requires the `molcrystalflow` package importable (i.e. run inside the
`molcrystalflow-github` conda env, or whichever env has it pip-installed) --
see compute_auxiliary_features.py in this same folder for the descriptor
formulas and their exactness caveats.

Usage:
    python generate_from_monomer.py \\
        --conformer path/to/monomer.xyz \\
        --z 4 \\
        --out_dir ./my_csp_input \\
        --tag MYMOL

    # then run inference (see printed command at the end), and convert:
    python pt_to_xyz.py --pt_file <predictions.pt> --out_xyz samples.xyz
"""
import argparse
import gzip
import pickle
import sys
from pathlib import Path

import numpy as np
import torch
from ase.io import read
from ase.data import atomic_numbers

sys.path.insert(0, str(Path(__file__).resolve().parent))
from compute_auxiliary_features import (  # noqa: E402
    compute_auxiliary_features,
    split_basic_geometric,
)

from molcrystalflow.data.dataset import preprocess_structure  # noqa: E402


def build_structure_entry(positions: np.ndarray, symbols: list, z: int, mirror_indices=None) -> dict:
    """Build one MCDataset-schema entry for Z copies of a single monomer conformer.

    mirror_indices: 0-based building-block indices to reflect (negate x) before
    placement. A pure translation of the same conformer can only ever produce
    IDENTICAL axis_flips across building blocks (translation is a proper, i.e.
    parity-preserving, operation). Real crystals in centrosymmetric or other
    improper space groups routinely place some copies as the mirror image of
    others (e.g. related by an inversion center) -- those blocks need mirror_indices
    set to get a differing, realistic axis_flips pattern instead of a uniform one.
    """
    mirror_indices = set(mirror_indices or [])
    n_atoms_per_bb = len(symbols)
    atom_types_bb = np.array([atomic_numbers[s] for s in symbols], dtype=np.int64)

    # Place all Z copies at the SAME location (no spatial offset). bb segmentation
    # inside preprocess_structure uses the explicit bb_indices label array, not
    # spatial separation, so overlapping copies are fine -- and it avoids a real
    # bug an earlier version of this script had: offsetting by e.g. +20 A and
    # then re-centering (subtracting the mean back out) loses enough floating-point
    # precision to occasionally flip the discrete axis_flips decision at random,
    # corrupting a value that's supposed to be a controlled, physically meaningful
    # choice (see mirror_indices above) rather than offset-magnitude-dependent noise.
    placed = []
    for i in range(z):
        bb_pos = positions.copy()
        if i in mirror_indices:
            bb_pos[:, 0] *= -1  # reflect through the yz-plane: flips parity/handedness
        placed.append(bb_pos)

    all_positions = np.concatenate(placed, axis=0)
    all_atom_types = np.tile(atom_types_bb, z)
    bb_indices = np.repeat(np.arange(z), n_atoms_per_bb)

    lattice_matrix = np.eye(3) * 20.0  # placeholder, unused at sampling time

    feats = preprocess_structure(lattice_matrix, all_positions, all_atom_types, bb_indices)

    aux_feats = compute_auxiliary_features(positions, symbols)
    basic_row, geometric_row = split_basic_geometric(aux_feats)

    entry = {
        "bb_num_vec": feats["bb_num_vec"],
        "trans_1": feats["trans_1"],
        "rotmats_1": feats["rotmats_1"],
        "atom_types": feats["atom_types"],
        "local_coords": feats["local_coords"],
        "gt_coords": feats["gt_coords"],
        "eigenvalues": feats["eigenvalues"],
        "lattice_1": feats["lattice_1"],
        "axis_flips": feats["axis_flips"],
        "basic_features": torch.tensor(np.tile(basic_row, (z, 1))).float(),
        "geometric_features": torch.tensor(np.tile(geometric_row, (z, 1))).float(),
    }
    return entry


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--conformer", required=True, help="Path to monomer conformer (xyz/extxyz/sdf/pdb -- anything ase.io.read supports)")
    parser.add_argument("--z", type=int, required=True, help="Number of molecules per unit cell (Z)")
    parser.add_argument("--out_dir", required=True, help="Output directory; will contain test_molcrystal_normalized.pkl.gz")
    parser.add_argument("--tag", default="structure", help="Label, only used in printed summary")
    parser.add_argument(
        "--mirror", default="",
        help="Comma-separated 0-based building-block indices to place as the mirror "
             "image of the reference conformer, e.g. '1' for a Z=2 centrosymmetric-style "
             "structure (bb 0 normal, bb 1 mirrored -> different axis_flips). Default: "
             "none (all Z copies share one flip state, correct only for space groups "
             "where every copy is related by proper rotations/translations)."
    )
    args = parser.parse_args()

    atoms = read(args.conformer)
    positions = atoms.get_positions()
    symbols = atoms.get_chemical_symbols()

    mirror_indices = [int(x) for x in args.mirror.split(",") if x.strip() != ""]
    entry = build_structure_entry(positions, symbols, args.z, mirror_indices=mirror_indices)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "test_molcrystal_normalized.pkl.gz"
    with gzip.open(out_path, "wb") as f:
        pickle.dump([entry], f, protocol=pickle.HIGHEST_PROTOCOL)

    print(f"[{args.tag}] wrote 1 structure (Z={args.z}, {len(symbols)} atoms/monomer) to {out_path}")
    print(f"  axis_flips per building block: {entry['axis_flips'][:, 0].tolist()}"
          f"  (mirrored indices: {sorted(mirror_indices) or 'none'})")
    print()
    print("Next, run crystal structure prediction (CSP) sampling with a trained checkpoint")
    print("(struct_idx=0 selects our only entry):")
    print(f"""
python -m molcrystalflow.experiments.inference \\
    --config-name=ccdc_inference.yaml \\
    inference.ckpt_path=/path/to/epoch_436-*.ckpt \\
    data.cache_dir={out_dir} \\
    inference.struct_idx=0 \\
    inference.num_samples=10 \\
    inference.output_dir=./inference_outputs_{args.tag} \\
    inference.seed=123
""")
    print("Then convert the resulting predictions_*.pt to a viewable structure file:")
    print(f"    python pt_to_xyz.py --pt_file ./inference_outputs_{args.tag}/predictions_10.pt --out_xyz {args.tag}_samples.xyz")


if __name__ == "__main__":
    main()
