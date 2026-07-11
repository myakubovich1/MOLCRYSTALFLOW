#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "${BACKEND_DIR}/.env" ]]; then
  set -a
  source "${BACKEND_DIR}/.env"
  set +a
fi

export BACKEND_ROOT="${BACKEND_ROOT:-${BACKEND_DIR}}"
export MOLFLOW_GENERATOR_BACKEND="${MOLFLOW_GENERATOR_BACKEND:-ccdc_v2}"
export MCF_ROOT="${MCF_ROOT:-/home/liu-group/projects/MolCrystalFlow}"
export CSP_DIR="${CSP_DIR:-${MCF_ROOT}/csp-pipeline}"
export MOLFLOW_CSP_DIR="${MOLFLOW_CSP_DIR:-${CSP_DIR}}"
export MOLFLOW_CSP_SRC_DIR="${MOLFLOW_CSP_SRC_DIR:-${MOLFLOW_CSP_DIR}/src}"
export MOLFLOW_V2_RUNTIME_ROOT="${MOLFLOW_V2_RUNTIME_ROOT:-${BACKEND_DIR}/runtime/ccdc-v2}"
export MOLFLOW_V2_CHECKPOINT_PATH="${MOLFLOW_V2_CHECKPOINT_PATH:-${MOLFLOW_V2_RUNTIME_ROOT}/checkpoints/best.ckpt}"
export MOLFLOW_V2_CONFIG_PATH="${MOLFLOW_V2_CONFIG_PATH:-${MOLFLOW_V2_RUNTIME_ROOT}/checkpoints/config.yaml}"
export MOLFLOW_V2_DEVICE="${MOLFLOW_V2_DEVICE:-cuda:0}"
export MOLFLOW_V2_NUM_TIMESTEPS="${MOLFLOW_V2_NUM_TIMESTEPS:-50}"
export MOLFLOW_V2_FEATURE_MODE="${MOLFLOW_V2_FEATURE_MODE:-neutral}"
export MOLFLOW_POTENTIAL_PROVIDER="${MOLFLOW_POTENTIAL_PROVIDER:-uma}"
export MOLFLOW_UMA_MODEL="${MOLFLOW_UMA_MODEL:-uma-s-1p2}"
export MOLFLOW_RIGID_BODY_STEPS="${MOLFLOW_RIGID_BODY_STEPS:-10}"
export PYTHONPATH="${BACKEND_DIR}:${MOLFLOW_V2_RUNTIME_ROOT}:${MCF_ROOT}:${MOLFLOW_CSP_DIR}:${MOLFLOW_CSP_SRC_DIR}:${PYTHONPATH:-}"

if [[ -z "${MOLFLOW_API_TOKEN:-}" ]]; then
  echo "MOLFLOW_API_TOKEN is not configured."
  echo "Copy .env.example to .env and set the same token used by the frontend."
  exit 1
fi

python "${BACKEND_DIR}/verify_runtime.py"
exec uvicorn app.main:app --host 0.0.0.0 --port "${MOLFLOW_PORT:-8000}"
