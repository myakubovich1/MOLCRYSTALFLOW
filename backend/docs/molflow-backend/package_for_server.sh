#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_PATH="${1:-/tmp/molflow-backend-v2.tar.gz}"

tar \
  --exclude='.env' \
  --exclude='jobs' \
  --exclude='smoke-output' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  -czf "${OUTPUT_PATH}" \
  -C "${BACKEND_DIR}" \
  .

echo "Created server bundle: ${OUTPUT_PATH}"
du -h "${OUTPUT_PATH}"
