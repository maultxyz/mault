#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/mault"
umask 077
mkdir -p "$LOG_DIR"
exec >>"$LOG_DIR/shortener.log" 2>&1
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/pi/shortener-secret.sh"
pi_export_shortener_secret "$LOG_DIR"

exec node --env-file="$ROOT/.env" "$ROOT/packages/shortener/dist/index.js"
