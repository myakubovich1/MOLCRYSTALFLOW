#!/bin/bash
#SBATCH --job-name=csp-example
#SBATCH --output=slurm-outputs/R-%x.%j.out
#SBATCH --error=slurm-outputs/R-%x.%j.err
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
#SBATCH --mem-per-cpu=4gb
#SBATCH --account=genai-mingjieliu
#SBATCH --qos=genai-mingjieliu
#SBATCH --distribution=cyclic:cyclic
#SBATCH --partition=hpg-turin
#SBATCH --gpus=1
#SBATCH --time=0-01:00:00

# =============================================================================
# End-to-end CSP example: monomer conformer + Z -> generated crystal
# =============================================================================
# See README.md in this folder for full instructions. Chains together:
#   1. generate_from_monomer.py  (conformer + Z -> model input pkl.gz)
#   2. molcrystalflow.experiments.inference  (checkpoint -> sampled structures)
#   3. pt_to_xyz.py  (predictions.pt -> viewable extxyz)
#
# IMPORTANT: cd into this folder before submitting -- SLURM stages the submitted
# script into a spool directory before running it, so BASH_SOURCE-based
# self-location does not work under sbatch. This script instead uses $(pwd),
# so it must be launched with this directory as the working directory (the
# same convention used by every other submit_*.sh script in this repo).
#
# Usage:
#   cd /path/to/csp_inference_kit
#   CKPT_PATH=/path/to/epoch_436-*.ckpt sbatch submit_csp_example.sh
#
# Optional overrides (set as env vars before sbatch):
#   CONFORMER=... Z=2 NUM_SAMPLES=10 NUM_TIMESTEPS=50 OUT_ROOT=... sbatch ...
#
# MIRROR: comma-separated 0-based building-block indices to place as the mirror
# image of the others -- needed for Z>1 crystals in centrosymmetric/improper
# space groups, where some copies are genuinely mirror images (e.g. related by
# an inversion center), not just rotated/translated. Default: none (all copies
# share one flip state -- only correct if every copy is related by a proper
# rotation/translation). E.g. MIRROR=1 for a typical Z=2 centrosymmetric case.
#
# If your SLURM account/partition differ from the #SBATCH defaults above,
# override on the command line, e.g.:
#   sbatch --account=myaccount --qos=myaccount --partition=mypartition submit_csp_example.sh
# =============================================================================

set -eo pipefail

module load conda
set +u; mamba activate molcrystalflow-github; set -u

KIT_DIR="$(pwd)"

if [[ ! -f "${KIT_DIR}/generate_from_monomer.py" ]]; then
    echo "Error: generate_from_monomer.py not found in $(pwd)."
    echo "cd into the csp_inference_kit directory before running sbatch."
    exit 1
fi

if [[ -z "${CKPT_PATH:-}" ]]; then
    echo "Error: CKPT_PATH is required (path to your epoch_436-*.ckpt or other trained checkpoint)."
    echo "Usage: CKPT_PATH=/path/to/checkpoint.ckpt sbatch submit_csp_example.sh"
    exit 1
fi

CONFORMER="${CONFORMER:-${KIT_DIR}/example_monomer/ACACPD.sdf}"
Z="${Z:-2}"
MIRROR="${MIRROR:-}"
NUM_SAMPLES="${NUM_SAMPLES:-10}"
NUM_TIMESTEPS="${NUM_TIMESTEPS:-50}"
OUT_ROOT="${OUT_ROOT:-${KIT_DIR}/outputs}"
TAG="${TAG:-example}"

INPUT_DIR="${OUT_ROOT}/model_input"
PRED_DIR="${OUT_ROOT}/predictions"
XYZ_OUT="${OUT_ROOT}/${TAG}_samples.xyz"

mkdir -p slurm-outputs "${INPUT_DIR}" "${PRED_DIR}"

echo "=============================================="
echo "CSP example"
echo "=============================================="
echo "Kit dir       : ${KIT_DIR}"
echo "Conformer     : ${CONFORMER}"
echo "Z             : ${Z}"
echo "Mirror        : ${MIRROR:-none}"
echo "Checkpoint    : ${CKPT_PATH}"
echo "Num samples   : ${NUM_SAMPLES}"
echo "Num timesteps : ${NUM_TIMESTEPS}"
echo "Output root   : ${OUT_ROOT}"
echo "Host          : $(hostname)"
echo "Start time    : $(date)"
echo "=============================================="

# ---------------------------------------------------------------------------
# Step 1: conformer + Z -> model input (test_molcrystal_normalized.pkl.gz)
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 1: build model input from conformer ---"
python "${KIT_DIR}/generate_from_monomer.py" \
    --conformer "${CONFORMER}" \
    --z "${Z}" \
    --mirror "${MIRROR}" \
    --out_dir "${INPUT_DIR}" \
    --tag "${TAG}"

# ---------------------------------------------------------------------------
# Step 2: CSP sampling with the trained checkpoint
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 2: run CSP sampling ---"
python -m molcrystalflow.experiments.inference \
    --config-name=ccdc_inference.yaml \
    inference.ckpt_path="${CKPT_PATH}" \
    data.cache_dir="${INPUT_DIR}" \
    inference.struct_idx=0 \
    inference.num_samples="${NUM_SAMPLES}" \
    interpolant.sampling.num_timesteps="${NUM_TIMESTEPS}" \
    inference.output_dir="${PRED_DIR}" \
    inference.seed=123

# ---------------------------------------------------------------------------
# Step 3: predictions.pt -> viewable extxyz
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 3: convert predictions to extxyz ---"
PRED_PT="${PRED_DIR}/predictions_${NUM_SAMPLES}.pt"
python "${KIT_DIR}/pt_to_xyz.py" \
    --pt_file "${PRED_PT}" \
    --out_xyz "${XYZ_OUT}"

echo ""
echo "=============================================="
echo "Done at $(date)"
echo "Generated structures: ${XYZ_OUT}"
echo "=============================================="
