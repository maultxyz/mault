#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")" && pwd)/session.sh"

KIOSK=0
HEADLESS=0
for argument in "$@"; do
  case "$argument" in
    --kiosk) KIOSK=1 ;;
    --headless) HEADLESS=1 ;;
    --help|-h) echo "Usage: $0 [--headless | --kiosk]"; exit 0 ;;
    *) echo "Unknown argument: $argument" >&2; exit 1 ;;
  esac
done
if [[ "$HEADLESS" -eq 1 && "$KIOSK" -eq 1 ]]; then
  echo "Choose --headless or --kiosk, not both." >&2
  exit 1
fi

pi_require_user
pi_ensure_user_bus

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

if [[ "$HEADLESS" -eq 1 || -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]]; then
  pi_print_urls
  echo "Services are running. Open Mault in a browser on another device."
  exit 0
fi
if [[ ! -x /usr/bin/chromium ]]; then
  pi_print_urls
  echo "Chromium is not installed; services are running without a local browser."
  exit 0
fi

PROFILE="$HOME/.local/share/mault/chromium"
mkdir -p "$PROFILE"
systemctl --user stop mault-camtest.service mault-kiosk.service 2>/dev/null || true

CHROMIUM_ARGS=(
  --no-first-run
  --password-store=basic
  --user-data-dir="$PROFILE"
  --app=http://127.0.0.1:8080/app
)
if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
  CHROMIUM_ARGS+=(--ozone-platform=wayland)
else
  CHROMIUM_ARGS+=(--ozone-platform=x11)
fi
if [[ "$KIOSK" -eq 1 ]]; then
  CHROMIUM_ARGS+=(--kiosk --start-fullscreen)
else
  CHROMIUM_ARGS+=(--start-maximized)
fi

systemd-run --user --collect --unit=mault-kiosk \
  --setenv=XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
  --setenv=WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
  --setenv=DISPLAY="${DISPLAY:-}" \
  --setenv=DBUS_SESSION_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS" \
  /usr/bin/chromium "${CHROMIUM_ARGS[@]}"

pi_print_urls
echo "Chromium is open. The Mault camera service owns the USB webcam."
