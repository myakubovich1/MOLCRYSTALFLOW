#!/usr/bin/env python
"""
compute_auxiliary_features -- the 9 molecular descriptors the CCDC-v2 model expects.

WHY YOU'RE GETTING THIS
------------------------
Your backend currently substitutes zeros for 9 missing descriptors when a
precomputed feature JSON isn't found, which pushes the input off the training
distribution and compresses the generated crystal structures. Those 9 values
are consumed as `basic_features` (2) + `geometric_features` (7) by the model
(see molcrystalflow/models/molcrystalnet.py -- the epoch_436 checkpoint's
node_extra_dim=13 = bb_num(1) + eigenvalues(3) + geometric(7) + basic(2)).
This file computes them directly from a conformer instead of zero-filling.

THERE IS NO SEPARATE SCALER/NORMALIZATION FILE TO SHIP YOU.
We checked the full training pipeline (thurlemann23/, ccdc-stage1/,
molcrystalflow/models/, molcrystalflow/data/) -- there is no StandardScaler,
mean/std buffer, or any other normalization artifact for these 9 descriptors
anywhere. They are fed into the model raw. So the zero-fill bug was never a
missing-scaler problem, it's a missing-feature-computation problem -- this
file is the fix.

WHAT'S VERIFIED vs. APPROXIMATE
--------------------------------
These formulas were reverse-engineered by fitting candidates against a real
ground-truth CSD-derived feature JSON (refcode ACACPD) and checking bit-exact
agreement (float32 precision):
    - num_heavy_atoms, molecular_weight        EXACT
    - radius_of_gyration, asphericity,
      eccentricity                             EXACT (mass-weighted gyration
                                                 tensor eigenvalues)
    - principal_component_{1,2,3}_length        EXACT (coordinate extents
                                                 projected onto the UNWEIGHTED
                                                 covariance's eigenvectors --
                                                 note this uses a DIFFERENT
                                                 eigenbasis than rg/asph/ecc;
                                                 verified this is what the
                                                 ground truth actually does)
    - planarity                                 APPROXIMATE ONLY. Best
                                                 candidate found (I2/I1) is
                                                 off by ~0.01 from the one
                                                 ground-truth value checked.
                                                 No closed-form formula tried
                                                 reproduced it exactly. If you
                                                 have access to CCDC's
                                                 csd-python-api, prefer
                                                 `ccdc.descriptors.
                                                 MolecularDescriptors.
                                                 planarity(...)` instead.

No bonds, SMILES, RDKit, Open Babel, or the CSD API are required -- only
atomic symbols and 3D positions of the isolated monomer conformer.

USAGE
-----
As a library:
    from compute_auxiliary_features import compute_auxiliary_features
    feats = compute_auxiliary_features(positions, symbols)
    # feats == {"num_heavy_atoms": ..., "molecular_weight": ...,
    #           "radius_of_gyration": ..., "asphericity": ...,
    #           "eccentricity": ..., "planarity": ...,
    #           "principal_component_1_length": ...,
    #           "principal_component_2_length": ...,
    #           "principal_component_3_length": ...}

    # If you need them as the two ordered arrays the model actually consumes:
    basic_row, geometric_row = split_basic_geometric(feats)

From the command line (prints the 9 values for a conformer file):
    python compute_auxiliary_features.py --conformer monomer.xyz

Only dependency: numpy + ase (for the periodic table lookup; ase is already
used throughout this codebase).
"""
import argparse

import numpy as np
from ase.data import atomic_masses, atomic_numbers

BASIC_FEATURES = ["num_heavy_atoms", "molecular_weight"]
GEOMETRIC_FEATURES = [
    "radius_of_gyration", "asphericity", "eccentricity", "planarity",
    "principal_component_1_length", "principal_component_2_length",
    "principal_component_3_length",
]


def compute_auxiliary_features(positions: np.ndarray, symbols: list) -> dict:
    """Compute all 9 auxiliary descriptors for one monomer conformer.

    Args:
        positions: (N, 3) array of Cartesian coordinates (Angstrom).
        symbols: list of N element symbols, e.g. ["Pd", "O", "O", "C", ...].

    Returns:
        Dict with keys BASIC_FEATURES + GEOMETRIC_FEATURES (9 total).
    """
    positions = np.asarray(positions, dtype=float)
    masses = np.array([atomic_masses[atomic_numbers[s]] for s in symbols])

    feats = {}
    feats.update(_basic_descriptors(symbols))
    feats.update(_geometric_descriptors(positions, masses))
    return feats


def split_basic_geometric(feats: dict):
    """Return (basic_row, geometric_row) in the exact column order the model expects."""
    basic_row = np.array([feats[k] for k in BASIC_FEATURES], dtype=np.float32)
    geometric_row = np.array([feats[k] for k in GEOMETRIC_FEATURES], dtype=np.float32)
    return basic_row, geometric_row


def _basic_descriptors(symbols: list) -> dict:
    n_heavy = sum(1 for s in symbols if s != "H")
    mw = sum(atomic_masses[atomic_numbers[s]] for s in symbols)
    return {"num_heavy_atoms": float(n_heavy), "molecular_weight": float(mw)}


def _geometric_descriptors(positions: np.ndarray, masses: np.ndarray) -> dict:
    """Shape descriptors matching the CSD-derived training features.

    rg / asphericity / eccentricity come from the MASS-WEIGHTED gyration
    tensor's eigenvalues. principal_component_*_length are the coordinate
    extents projected onto the UNWEIGHTED covariance's eigenvectors -- the
    ground truth mixes these two (verified bit-exact against ACACPD; using
    the mass-weighted eigenvectors for the extents instead is close but off
    by ~3% on the smallest axis). planarity is a best-effort approximation
    (see module docstring).
    """
    w = masses / masses.sum()
    mass_centroid = (positions * w[:, None]).sum(axis=0)
    cw = positions - mass_centroid
    cov_w = (cw * w[:, None]).T @ cw
    eigvals, _ = np.linalg.eigh(cov_w)
    I1, I2, I3 = eigvals[::-1]  # descending

    rg = float(np.sqrt(I1 + I2 + I3))
    asphericity = float(I1 - 0.5 * (I2 + I3))
    eccentricity = float(np.sqrt(1 - I3 / I1)) if I1 > 0 else 0.0
    planarity = float(I2 / I1) if I1 > 0 else 0.0  # best-effort, see caveat

    centroid_u = positions.mean(axis=0)
    cu = positions - centroid_u
    cov_u = cu.T @ cu / len(cu)
    _, eigvecs_u = np.linalg.eigh(cov_u)
    order_u = np.argsort(np.linalg.eigvalsh(cov_u))[::-1]
    eigvecs_u = eigvecs_u[:, order_u]

    proj = cu @ eigvecs_u
    pc_lengths = (proj.max(axis=0) - proj.min(axis=0)).tolist()

    return {
        "radius_of_gyration": rg,
        "asphericity": asphericity,
        "eccentricity": eccentricity,
        "planarity": planarity,
        "principal_component_1_length": pc_lengths[0],
        "principal_component_2_length": pc_lengths[1],
        "principal_component_3_length": pc_lengths[2],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--conformer", required=True, help="Path to a monomer conformer (xyz/extxyz/sdf/pdb -- anything ase.io.read supports)")
    args = parser.parse_args()

    from ase.io import read
    atoms = read(args.conformer)
    feats = compute_auxiliary_features(atoms.get_positions(), atoms.get_chemical_symbols())

    print(f"Auxiliary features for {args.conformer}:")
    for k in BASIC_FEATURES + GEOMETRIC_FEATURES:
        flag = "  (approximate)" if k == "planarity" else ""
        print(f"  {k:32s} = {feats[k]:.6f}{flag}")


if __name__ == "__main__":
    main()
