#!/usr/bin/env bash
set -euo pipefail

# Disable ONNX telemetry for the API and its child processes.
export ORT_DISABLE_TELEMETRY=1

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="$ROOT/node/bin:$PATH"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/mault"
umask 077
mkdir -p "$LOG_DIR"
exec >>"$LOG_DIR/api.log" 2>&1
cd "$ROOT"

database_ready=0
for _ in $(seq 1 50); do
  if (echo >/dev/tcp/127.0.0.1/5432) >/dev/null 2>&1; then
    database_ready=1
    break
  fi
  sleep 0.2
done
if [[ "$database_ready" -eq 0 ]]; then
  echo "[api] PostgreSQL did not become available on 127.0.0.1:5432." >&2
  exit 1
fi

(cd "$ROOT/packages/server" && node_modules/.bin/tsx scripts/migrate-local.ts)
exec node --env-file="$ROOT/.env" "$ROOT/packages/server/dist/index.js"
