#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
set -a
source "$ROOT/.env"
set +a
sorter_mode="${PI_SORTER:-0}"
case "${sorter_mode,,}" in
  1|true|on) ;;
  *) exit 0 ;;
esac
umask 077
mkdir -p "$ROOT/.pi-controller"
cd "$ROOT/.pi-controller"
export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
exec /usr/bin/python3 -m scripts.pi.controller.server \
  --socket "${PI_CONTROLLER_SOCKET:-$ROOT/.pi-controller/controller.sock}" \
  --config "${PI_CONTROLLER_CONFIG:-$ROOT/.pi-controller/calibration.json}" \
  --enable-motion
