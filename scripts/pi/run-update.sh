#!/bin/bash
# Runs an update the app asked for, as root (mault-update.service, started by
# mault-update.path when the API drops a request file). Installed to
# /usr/local/lib/mault by secure-layout.sh and never run from a release. The
# request carries nothing: the release always comes from the manifest named in
# the installed, root-owned release.json, so the service account can ask for an
# update but never choose what gets installed. Release code runs only after
# trusted-tree.py has checked it.
set -euo pipefail
if [[ "$EUID" -eq 0 ]]; then export PATH=/usr/sbin:/usr/bin:/sbin:/bin; fi
unset BASH_ENV ENV

MAULT_HOME="${MAULT_HOME:-/opt/mault}"
MAULT_LIB="${MAULT_LIB:-/usr/local/lib/mault}"
CURRENT="$MAULT_HOME/current"
STATE_DIR="${MAULT_SYSTEM_STATE:-/var/lib/mault-system}"
STATE_FILE="$STATE_DIR/update.json"
REQUEST="$STATE_DIR/requests/update-request"

write_state() {
  python3 -I - "$STATE_FILE" "$1" <<'PY'
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
  python3 -I "$MAULT_LIB/trusted-tree.py" --release "$CURRENT"
  bash "$CURRENT/scripts/pi/update.sh"
  python3 -I "$MAULT_LIB/trusted-tree.py" --release "$CURRENT"
  bash "$CURRENT/scripts/pi/secure-layout.sh"
  bash "$MAULT_LIB/os-updates.sh" || echo "[update] Could not turn on automatic OS updates."
}

main "$@"
