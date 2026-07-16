#!/usr/bin/env python3
"""
Convert a single-structure predictions .pt file (from MolCrystalFlow inference)
to an extxyz file with one frame per sample.

Requires the `molcrystalflow` package importable (run inside the
`molcrystalflow-github` conda env, or whichever env has it pip-installed).

Usage:
    python pt_to_xyz.py \\
        --pt_file  /path/to/predictions_10.pt \\
        --out_xyz  /path/to/samples.xyz
"""
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Convert inference .pt -> extxyz (one frame per sample)"
    )
    parser.add_argument("--pt_file", required=True, help="Path to predictions_N.pt")
    parser.add_argument("--out_xyz", required=True, help="Output extxyz file path")
    args = parser.parse_args()

    pt_file = Path(args.pt_file).resolve()
    out_xyz = Path(args.out_xyz).resolve()

    from molcrystalflow.data.utils import visualize_predictions

    gt_tmp_name = "_gt_tmp.xyz"
    visualize_predictions(
        str(pt_file),
        save_dir=str(out_xyz.parent),
        pred_xyz=out_xyz.name,
        gt_xyz=gt_tmp_name,
    )

    # Discard ground-truth sidecar (meaningless here -- CSP sampling has no real GT)
    gt_tmp = out_xyz.parent / gt_tmp_name
    if gt_tmp.exists():
        gt_tmp.unlink()

    from ase.io import read
    n = len(read(str(out_xyz), index=":"))
    print(f"pt_to_xyz: wrote {n} structures to {out_xyz}")


if __name__ == "__main__":
    main()
