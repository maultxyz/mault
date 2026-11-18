#!/bin/bash
# Runs an update the app asked for, as root (mault-update.service, started by
# mault-update.path when the API drops a request file). The request carries
# nothing: the release always comes from the manifest named in the installed,
# root-owned release.json, so the service account can ask for an update but
# never choose what gets installed.
set -euo pipefail

STATE_DIR="${MAULT_SYSTEM_STATE:-/var/lib/mault-system}"
STATE_FILE="$STATE_DIR/update.json"
REQUEST="$STATE_DIR/requests/update-request"

write_state() {
  python3 - "$STATE_FILE" "$1" <<'PY'
import json
import os
import sys
import time

path, phase = sys.argv[1], sys.argv[2]
try:
    with open(path) as file:
        state = json.load(file)
except (OSError, ValueError):
    state = {}
if phase == "running":
    state = {"phase": "running", "startedAt": int(time.time() * 1000), "message": None}
else:
    state["phase"] = phase
    state["message"] = None if phase == "succeeded" else "Update failed. Check the update log with: sudo mault logs update"
with open(f"{path}.tmp", "w") as file:
    json.dump(state, file)
os.chmod(f"{path}.tmp", 0o640)
os.replace(f"{path}.tmp", path)
PY
}

main() {
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  umask 027
  mkdir -p "$STATE_DIR"
  exec >>"$STATE_DIR/update.log" 2>&1
  write_state running
  rm -f "$REQUEST"

  finish_update() {
    result=$?
    trap - EXIT
    write_state "$([[ "$result" -eq 0 ]] && echo succeeded || echo failed)"
    exit "$result"
  }
  trap finish_update EXIT
  sleep 2
  bash "$ROOT/scripts/pi/update.sh"
  bash "${MAULT_HOME:-/opt/mault}/current/scripts/pi/secure-layout.sh"
}

main "$@"
