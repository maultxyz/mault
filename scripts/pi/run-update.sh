#!/bin/bash
set -euo pipefail

main() {
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/mault"
  umask 077
  mkdir -p "$STATE_DIR"
  exec >>"$STATE_DIR/update.log" 2>&1

  finish_update() {
    result=$?
    trap - EXIT
    python3 - "$STATE_DIR/update.json" "$result" <<'PY'
import json
import os
import sys

path, result = sys.argv[1], sys.argv[2]
with open(path) as file:
    state = json.load(file)
state["phase"] = "succeeded" if result == "0" else "failed"
state["message"] = None if result == "0" else "Update failed. Check the update log with: sudo mault logs update"
with open(f"{path}.tmp", "w") as file:
    json.dump(state, file)
os.chmod(f"{path}.tmp", 0o600)
os.replace(f"{path}.tmp", path)
PY
    exit "$result"
  }
  trap finish_update EXIT
  sleep 2
  bash "$ROOT/scripts/pi/update.sh"
}

main "$@"
