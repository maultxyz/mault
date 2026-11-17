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
    node - "$STATE_DIR/update.json" "$result" <<'JS'
const fs = require("node:fs");
const file = process.argv[2];
const succeeded = process.argv[3] === "0";
const state = JSON.parse(fs.readFileSync(file, "utf8"));
state.phase = succeeded ? "succeeded" : "failed";
state.message = succeeded ? null : "Update failed. Check the Linux update log.";
fs.writeFileSync(`${file}.tmp`, JSON.stringify(state), { mode: 0o600 });
fs.renameSync(`${file}.tmp`, file);
JS
    exit "$result"
  }
  trap finish_update EXIT
  sleep 2
  bash "$ROOT/scripts/pi/update.sh"
}

main "$@"
