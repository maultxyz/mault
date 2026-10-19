#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UID_NUM="$(id -u)"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$UID_NUM}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"

KIOSK=0
if [[ "${1:-}" == "--kiosk" ]]; then
  KIOSK=1
fi

if [[ ! -f "$ROOT/packages/server/dist/index.js" || ! -f "$ROOT/packages/web/dist/index.html" ]]; then
  echo "The app is not built yet. Run scripts/pi/install.sh first." >&2
  exit 1
fi

systemctl --user start mault-camera.service mault-api.service mault-web.service

for _ in $(seq 1 60); do
  if curl -sf http://127.0.0.1:8080/ >/dev/null; then
    break
  fi
  sleep 0.5
done

if ! curl -sf http://127.0.0.1:8080/ >/dev/null; then
  echo "The web app did not come up on port 8080." >&2
  systemctl --user --no-pager --full status mault-api.service mault-web.service || true
  exit 1
fi

PROFILE="$HOME/.local/share/mault/chromium"
mkdir -p "$PROFILE"
systemctl --user stop mault-camtest.service mault-kiosk.service 2>/dev/null || true

CHROMIUM_ARGS=(
  --ozone-platform=wayland
  --no-first-run
  --password-store=basic
  --user-data-dir="$PROFILE"
  --app=http://127.0.0.1:8080/app
)
if [[ "$KIOSK" -eq 1 ]]; then
  CHROMIUM_ARGS+=(--kiosk --start-fullscreen)
else
  CHROMIUM_ARGS+=(--start-maximized)
fi

systemd-run --user --collect --unit=mault-kiosk \
  --setenv=XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
  --setenv=WAYLAND_DISPLAY="$WAYLAND_DISPLAY" \
  --setenv=DBUS_SESSION_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS" \
  /usr/bin/chromium "${CHROMIUM_ARGS[@]}"

echo "Mault is running at http://127.0.0.1:8080"
for addr in $(hostname -I 2>/dev/null); do
  case "$addr" in
    *:*|127.*) continue ;;
  esac
  echo "Other computers on this network: http://${addr}:8080"
done
echo "Chromium is open on the desktop. Allow the camera if it asks."
