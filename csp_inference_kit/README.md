# CSP Inference Kit

Everything you need to go from a **monomer conformer + Z** (number of
molecules per unit cell) to a **predicted crystal structure** using the
trained MolCrystalFlow checkpoint, without hitting the "zeros for 9 missing
descriptors -> compressed structures" bug.

This is **crystal structure prediction (CSP)**, not de novo molecular
generation: the molecule is given and fixed; only its packing into a crystal
lattice is predicted.

## What's in this folder

| File | What it does |
|---|---|
| `compute_auxiliary_features.py` | Computes the 9 auxiliary molecular descriptors (`basic_features` + `geometric_features`) from a raw conformer. **This replaces your zero-fill fallback.** Standalone, only needs `numpy` + `ase`. |
| `generate_from_monomer.py` | Takes a conformer file + Z, builds the exact input format the model expects (`test_molcrystal_normalized.pkl.gz`). Needs `molcrystalflow` importable. |
| `pt_to_xyz.py` | Converts the raw prediction tensors (`predictions_N.pt`) into a viewable `.xyz` file. |
| `submit_csp_example.sh` | SLURM script that chains all three steps into one job. |
| `example_monomer/ACACPD.sdf` | A real test molecule (Pd(acac)₂, 29 atoms, CCDC refcode ACACPD, real Z=2) to sanity-check your setup before trying your own molecules. |

## Why there's no separate "scaler" file

We checked the entire training pipeline for a `StandardScaler`, mean/std
buffer, or any other normalization artifact for these 9 descriptors. There
isn't one — they're fed into the model raw. So the fix is purely computing
them correctly (`compute_auxiliary_features.py`), not finding a
normalization file that doesn't exist.

## What's exact vs. approximate

The 9 descriptor formulas were reverse-engineered by fitting candidates
against a real ground-truth CSD-derived feature file and checking bit-exact
agreement:

- `num_heavy_atoms`, `molecular_weight` — **exact**
- `radius_of_gyration`, `asphericity`, `eccentricity` — **exact**
- `principal_component_{1,2,3}_length` — **exact**
- `planarity` — **approximate only** (best formula found is off by ~0.01
  from the one ground-truth value we could check). If you have access to
  CCDC's `csd-python-api`, prefer
  `ccdc.descriptors.MolecularDescriptors.planarity(...)` instead and patch
  `_geometric_descriptors()` in `compute_auxiliary_features.py`.

Full details and the exact math are documented in the docstring at the top
of `compute_auxiliary_features.py`.

## Prerequisites

1. A conda env with `molcrystalflow` pip-installed (editable or otherwise)
   and all its dependencies — e.g. the `molcrystalflow-github` env used
   throughout this project. Verify with:
   ```bash
   python -c "import molcrystalflow; print(molcrystalflow.__file__)"
   ```
2. A trained checkpoint file (you already have `epoch_436-*.ckpt`).
3. Access to a SLURM cluster with a GPU partition (or adapt Step 2 below to
   run locally on a GPU machine — it only takes a few seconds).

## Quickstart: run the bundled example (ACACPD)

```bash
cd /path/to/csp_inference_kit
CKPT_PATH=/path/to/epoch_436-step_1217482-loss_1.1853.ckpt sbatch submit_csp_example.sh
```

`CKPT_PATH` is the only required override. **You must `cd` into this folder
first** (not `sbatch /path/to/submit_csp_example.sh` from elsewhere) — SLURM
stages the submitted script into a spool directory before running it, so it
can't reliably find its own location on disk; it relies on your current
directory instead, the same convention every other `submit_*.sh` script in
this repo uses.

If your SLURM account/partition differ from the defaults baked into the
script (`genai-mingjieliu` / `hpg-turin`), override on the command line:
```bash
CKPT_PATH=/path/to/ckpt sbatch --account=myaccount --qos=myaccount --partition=mypartition submit_csp_example.sh
```

Output lands in `csp_inference_kit/outputs/example_samples.xyz` — 10
independently-sampled predicted crystal packings of Pd(acac)₂ at Z=2. Each
frame should have 58 atoms (Z × 29), reasonable ~7-10 Å lattice vectors, and
sane Pd–O / C–C / C–H bond lengths.

Also expect a `runs-ccdc-mcf/` folder to appear in whatever directory you
ran `sbatch` from — that's Hydra's own run-logging side effect from Step 2,
harmless and safe to delete.

## Running your own molecule

```bash
CKPT_PATH=/path/to/epoch_436-*.ckpt \
CONFORMER=/path/to/your_monomer.xyz \
Z=4 \
TAG=my_molecule \
sbatch submit_csp_example.sh
```

- `CONFORMER` — any format `ase.io.read` supports (`.xyz`, `.extxyz`,
  `.sdf`, `.pdb`, ...). Just the isolated molecule's 3D geometry — no bonds,
  charges, or SMILES needed.
- `Z` — number of molecules per unit cell for the crystal you want predicted.
- `NUM_SAMPLES` (default 10) — how many independent packings to sample.
- `NUM_TIMESTEPS` (default 50) — flow-matching integration steps.
- `OUT_ROOT` (default `<kit_dir>/outputs`) — where results are written.
- `MIRROR` — see "Mirrored building blocks" below. Default: none.

Output: `${OUT_ROOT}/${TAG}_samples.xyz`, one frame per sample.

## Mirrored building blocks (axis_flips) — when Z > 1

Each building block carries a discrete `axis_flips` bit that the model reads
at every layer, every timestep (`molcrystalnet.py`'s `axis_flip_embedding`).
It is **not** a rotation/orientation indicator — it's rotation-*invariant* by
construction (derived from a PCA-frame/equivariant-vector cross product that
co-rotates with the molecule, so any proper rotation leaves it unchanged). It
only flips between its two states under an *improper* transformation
(mirror/inversion). In other words: it encodes **parity/handedness**, not
orientation.

That matters because pure translation (what this script does by default) is
a proper operation, so by default **every building block gets the identical
flip state**. That's correct only if the real target crystal relates all Z
copies by proper operations (pure rotations, screw axes, translations).
Many real space groups don't work that way — centrosymmetric groups (e.g.
ACACPD's own space group, P2₁/n) place some copies related by an *inversion
center*, which is an improper operation: those copies are genuinely mirror
images of each other, and should get a *different* flip state, not the same
one.

Use `--mirror` (or the `MIRROR` env var for the SLURM script) to reflect
specific 0-based building-block indices before placement, e.g. for a typical
Z=2 centrosymmetric-style structure:
```bash
python generate_from_monomer.py --conformer your_monomer.xyz --z 2 --mirror 1 \
    --out_dir ./my_csp_input --tag my_molecule
```
This prints the resulting `axis_flips` per building block so you can confirm
the pattern you got, e.g. `[1.0, 0.0]` (mirrored) vs. `[1.0, 1.0]` (not
mirrored). For Z=4 with two mirrored copies: `--mirror 1,3`.

There's no single right answer without knowing the true space group — if
you're unsure, it's reasonable to generate samples both ways (`--mirror ""`
and `--mirror 1`) and compare, since which pattern is correct is itself part
of what CSP is trying to determine. `compute_auxiliary_features.py`'s output
(`basic_features`/`geometric_features`) is unaffected by mirroring — those
are reflection-invariant shape descriptors by construction, so they stay
identical across mirrored and non-mirrored copies, as they should.

**Implementation note:** an earlier version of this script placed the Z
copies on a coarse spatial grid (offsetting each by ~20 Å) purely to keep
`preprocess_structure`'s internal placeholder math non-degenerate. That
turned out to be an actual bug: adding a large offset and then centering it
back out loses enough floating-point precision to occasionally flip the
discrete `axis_flips` decision at random, corrupting a value that's supposed
to be a controlled, physically meaningful choice. Building-block segmentation
uses the explicit `bb_indices` label array, not spatial separation, so the
fix was simply placing all copies at the same location (zero offset) —
verified to give a stable, deterministic, offset-independent `axis_flips`
matching a direct single-conformer computation.

## Running the steps manually (no SLURM)

If you want to debug interactively instead of submitting a job:

```bash
# Step 1: conformer + Z -> model input
python generate_from_monomer.py \
    --conformer example_monomer/ACACPD.sdf \
    --z 2 \
    --out_dir ./my_csp_input \
    --tag ACACPD

# Step 2: CSP sampling (needs a GPU)
python -m molcrystalflow.experiments.inference \
    --config-name=ccdc_inference.yaml \
    inference.ckpt_path=/path/to/epoch_436-*.ckpt \
    data.cache_dir=./my_csp_input \
    inference.struct_idx=0 \
    inference.num_samples=10 \
    inference.output_dir=./my_predictions \
    inference.seed=123

# Step 3: predictions.pt -> viewable xyz
python pt_to_xyz.py \
    --pt_file ./my_predictions/predictions_10.pt \
    --out_xyz ACACPD_samples.xyz
```

You can also just check the descriptor computation on its own, without
running the model at all:
```bash
python compute_auxiliary_features.py --conformer example_monomer/ACACPD.sdf
```

## How this actually works, if you want to know

`generate_from_monomer.py` builds Z copies of your conformer (all at the
same location — `preprocess_structure` segments building blocks by the
explicit `bb_indices` label, not spatial position, so no placement offset is
needed), optionally mirroring some of them per `--mirror`, and computes:

- `local_coords`, `eigenvalues`, `axis_flips`, `bb_num_vec` — real, actively-
  used model inputs, via `molcrystalflow.data.dataset.preprocess_structure`
  (the same function the real training pipeline uses). These come entirely
  from your conformer's own geometry (and the mirror pattern you chose),
  independent of any crystal, and are fed to the network at every layer of
  every sampling timestep.
- `basic_features` / `geometric_features` — the 9 auxiliary descriptors from
  `compute_auxiliary_features.py`, tiled once per building block. Also real,
  actively-used model inputs.
- `trans_1`, `lattice_1` (values), `gt_coords` — written as placeholders
  with the correct shape but arbitrary values. Only used at training time to
  compute supervised losses; the sampling path draws its own noise from the
  flow-matching prior and never reads these values. Safe to fill with
  anything shape-correct.
- `rotmats_1` (the field) is placeholder in the same sense as the above —
  *but* the underlying rotation matrix it stores is the same one that
  defines `local_coords`, so don't confuse "the `rotmats_1` field is an
  unused placeholder" with "building-block orientation info is unused" —
  it isn't; it's just carried by `local_coords`/`axis_flips` instead.

No bonds, SMILES, RDKit, Open Babel, or CSD API access is required anywhere
in this pipeline — only atomic symbols and 3D positions of the isolated
molecule.
