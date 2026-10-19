#!/bin/bash
set -euo pipefail

UID_NUM="$(id -u)"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$UID_NUM}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"

systemctl --user stop mault-kiosk.service 2>/dev/null || true
systemctl --user stop mault-web.service mault-api.service mault-camera.service
echo "Mault stopped."
