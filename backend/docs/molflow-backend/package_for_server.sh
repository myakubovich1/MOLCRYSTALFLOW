#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_PATH="${1:-/tmp/molflow-backend-v2.tar.gz}"
OUTPUT_DIR="$(cd "$(dirname "${OUTPUT_PATH}")" && pwd)"
OUTPUT_NAME="$(basename "${OUTPUT_PATH}")"
OUTPUT_PATH="${OUTPUT_DIR}/${OUTPUT_NAME}"

case "${OUTPUT_PATH}" in
  *.zip)
    TEMP_DIR="$(mktemp -d "${OUTPUT_DIR}/.${OUTPUT_NAME}.XXXXXX")"
    TEMP_PATH="${TEMP_DIR}/${OUTPUT_NAME}"
    trap 'rm -rf "${TEMP_DIR}"' EXIT
    (
      cd "${BACKEND_DIR}"
      zip -q -r -D "${TEMP_PATH}" . \
        -x '.env' \
        -x 'jobs/*' \
        -x 'smoke-output/*' \
        -x 'validation-output/*' \
        -x '*/__pycache__/*' \
        -x '*.pyc' \
        -x '*.DS_Store'
    )
    mv "${TEMP_PATH}" "${OUTPUT_PATH}"
    rmdir "${TEMP_DIR}"
    trap - EXIT
    ;;
  *.tar.gz|*.tgz)
    tar \
      --exclude='.env' \
      --exclude='jobs' \
      --exclude='smoke-output' \
      --exclude='validation-output' \
      --exclude='__pycache__' \
      --exclude='*.pyc' \
      --exclude='.DS_Store' \
      -czf "${OUTPUT_PATH}" \
      -C "${BACKEND_DIR}" \
      .
    ;;
  *)
    echo "Output must end in .zip, .tar.gz, or .tgz: ${OUTPUT_PATH}" >&2
    exit 2
    ;;
esac

echo "Created server bundle: ${OUTPUT_PATH}"
du -h "${OUTPUT_PATH}"
