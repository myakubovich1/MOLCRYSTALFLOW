#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${BACKEND_DIR}"

if [[ ! -f .env ]]; then
  echo "Missing ${BACKEND_DIR}/.env." >&2
  echo "Copy the previous backend .env, then update the CCDC-v2 feature settings." >&2
  exit 1
fi

set -a
source .env
set +a

export BACKEND_ROOT="${BACKEND_ROOT:-${BACKEND_DIR}}"
export MOLFLOW_V2_RUNTIME_ROOT="${MOLFLOW_V2_RUNTIME_ROOT:-${BACKEND_DIR}/runtime/ccdc-v2}"
export MOLFLOW_V2_CHECKPOINT_PATH="${MOLFLOW_V2_CHECKPOINT_PATH:-${MOLFLOW_V2_RUNTIME_ROOT}/checkpoints/best.ckpt}"
export MOLFLOW_V2_CONFIG_PATH="${MOLFLOW_V2_CONFIG_PATH:-${MOLFLOW_V2_RUNTIME_ROOT}/checkpoints/config.yaml}"
export MOLFLOW_V2_FEATURE_MODE="${MOLFLOW_V2_FEATURE_MODE:-inference_kit}"
export MOLFLOW_POTENTIAL_PROVIDER="${MOLFLOW_POTENTIAL_PROVIDER:-uma}"
export MOLFLOW_UMA_MODEL="${MOLFLOW_UMA_MODEL:-uma-s-1p2}"
export MOLFLOW_UMA_TASK_NAME="${MOLFLOW_UMA_TASK_NAME:-omc}"
export MOLFLOW_RIGID_BODY_STEPS="${MOLFLOW_RIGID_BODY_STEPS:-10}"
export MCF_ROOT="${MCF_ROOT:-/home/liu-group/projects/MolCrystalFlow}"
export CSP_DIR="${CSP_DIR:-${MCF_ROOT}/csp-pipeline}"
export MOLFLOW_CSP_DIR="${MOLFLOW_CSP_DIR:-${CSP_DIR}}"
export MOLFLOW_CSP_SRC_DIR="${MOLFLOW_CSP_SRC_DIR:-${MOLFLOW_CSP_DIR}/src}"
export PYTHONPATH="${BACKEND_DIR}:${MOLFLOW_V2_RUNTIME_ROOT}:${MCF_ROOT}:${MOLFLOW_CSP_DIR}:${MOLFLOW_CSP_SRC_DIR}:${PYTHONPATH:-}"

if [[ "${CONDA_DEFAULT_ENV:-}" != "molcrystalflow" ]]; then
  echo "The molcrystalflow Conda environment is not active." >&2
  echo "Run: source ~/miniforge3/etc/profile.d/conda.sh && conda activate molcrystalflow" >&2
  exit 1
fi

if [[ -z "${MOLFLOW_API_TOKEN:-}" ]]; then
  echo "MOLFLOW_API_TOKEN is not configured in .env." >&2
  exit 1
fi

echo "[1/4] Runtime and scientific configuration"
python verify_runtime.py

echo "[2/4] Backend unit and regression tests"
python -m unittest discover -s tests -v

echo "[3/4] One-candidate CCDC-v2 smoke test"
python smoke_test_v2.py

echo "[4/4] Multi-sample CCDC-v2 + geometry + UMA validation"
python validate_end_to_end.py "$@"

echo "Lab validation passed. This candidate backend is ready for API-level testing."
