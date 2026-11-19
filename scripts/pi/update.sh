#!/bin/bash
# Installs the latest Pi release next to the running one, switches to it and
# rolls back when it does not come up. Runs as root, from `sudo mault update`
# or the app's update request (run-update.sh); the user services and anything
# that reads the service's own files run as the Mault service user. Root runs
# this only from a release trusted-tree.py has checked.
set -euo pipefail
if [[ "$EUID" -eq 0 ]]; then export PATH=/usr/sbin:/usr/bin:/sbin:/bin; fi
unset BASH_ENV ENV

MAULT_HOME="${MAULT_HOME:-/opt/mault}"
MAULT_DATA="${MAULT_DATA:-/var/lib/mault}"
MAULT_USER="${MAULT_USER:-mault-service}"
CURRENT="$MAULT_HOME/current"
STATE_DIR="${MAULT_SYSTEM_STATE:-/var/lib/mault-system}"

BUNDLE=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --bundle) BUNDLE="$(readlink -f "${2:-}")"; shift 2 ;;
    *) echo "Usage: $0 [--bundle FILE]" >&2; exit 1 ;;
  esac
done

if [[ "$(id -u)" != "${MAULT_UPDATE_RUN_AS_UID:-0}" ]]; then
  echo "[update] Run updates with: sudo mault update" >&2
  exit 1
fi

mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/update.lock"
if ! flock -n 9; then
  echo "[update] Another update is already running." >&2
  exit 1
fi

as_service_user() {
  if [[ "$(id -un)" == "$MAULT_USER" ]]; then
    env PATH="$CURRENT/node/bin:$PATH" "$@"
    return
  fi
  local uid
  uid="$(id -u "$MAULT_USER")"
  runuser -u "$MAULT_USER" -- env HOME="$MAULT_DATA" XDG_RUNTIME_DIR="/run/user/$uid" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" PATH="$CURRENT/node/bin:/usr/bin:/bin" "$@"
}

release_version() {
  python3 -I -c 'import json, sys; print(json.load(open(sys.argv[1]))["version"])' "$1/release.json"
}

installed_version="$(release_version "$CURRENT")"
manifest_url="$(python3 -I -c 'import json, sys; print(json.load(open(sys.argv[1]))["manifestUrl"])' "$CURRENT/release.json")"
if [[ -z "$BUNDLE" ]]; then
  latest_version="$(curl -fsSL "$manifest_url" | python3 -I -c 'import json, sys; print(json.load(sys.stdin)["version"])')"
  if [[ "$latest_version" == "$installed_version" ]]; then
    echo "[update] Mault $installed_version is already the latest version."
    exit 0
  fi
fi

fetch_arguments=(--fetch-only --manifest-url "$manifest_url")
[[ -n "$BUNDLE" ]] && fetch_arguments+=(--bundle "$BUNDLE")
release="$(bash "$CURRENT/scripts/pi/install.sh" "${fetch_arguments[@]}" | tail -1)"
previous="$(readlink -f "$CURRENT")"
if [[ "$(readlink -f "$release")" == "$previous" ]]; then
  echo "[update] Mault $installed_version is already installed."
  exit 0
fi

services_for() {
  local services=(mault-camera.service mault-api.service)
  if [[ "$(as_service_user node "$1/scripts/pi/controller-ready.mjs" "$1" --mode)" == builtin ]]; then
    services+=(mault-controller.service)
  fi
  echo "${services[@]}"
}

switch_to() {
  ln -sfn "$1" "$MAULT_HOME/current.new"
  mv -T "$MAULT_HOME/current.new" "$CURRENT"
  as_service_user node "$CURRENT/scripts/pi/install-services.mjs" "$CURRENT"
  as_service_user systemctl --user daemon-reload
}

start_and_check() {
  local services
  read -r -a services <<< "$(services_for "$CURRENT")"
  for unit in "${services[@]}"; do
    as_service_user systemctl --user reset-failed "$unit" 2>/dev/null || true
  done
  as_service_user systemctl --user start --no-block "${services[@]}"
  for _ in $(seq 1 "${MAULT_UPDATE_HEALTH_ATTEMPTS:-90}"); do
    if curl -fs --max-time 5 http://127.0.0.1:3001/public/version >/dev/null &&
      curl -fs --max-time 5 http://127.0.0.1:8080/ >/dev/null; then
      if [[ " ${services[*]} " != *" mault-controller.service "* ]] ||
        as_service_user node "$CURRENT/scripts/pi/controller-ready.mjs" "$CURRENT" >/dev/null 2>&1; then
        return 0
      fi
    fi
    sleep 2
  done
  return 1
}

read -r -a running_services <<< "$(services_for "$CURRENT")"
echo "[update] Stopping Mault $installed_version"
as_service_user systemctl --user stop "${running_services[@]}"
switch_to "$release"
new_version="$(release_version "$CURRENT")"
echo "[update] Starting Mault $new_version"
if start_and_check; then
  for old in "$MAULT_HOME"/releases/*/; do
    old="$(readlink -f "$old")"
    if [[ "$old" != "$(readlink -f "$CURRENT")" && "$old" != "$previous" ]]; then
      rm -rf "$old"
    fi
  done
  echo "[update] Mault $new_version is running. Reload your browsers."
  exit 0
fi

echo "[update] Mault $new_version did not start. Going back to $installed_version." >&2
as_service_user systemctl --user stop mault-camera.service mault-api.service mault-controller.service 2>/dev/null || true
switch_to "$previous"
if start_and_check; then
  echo "[update] Mault $installed_version is running again. Check the API log: sudo mault logs" >&2
else
  echo "[update] Mault did not restart. Check the API log: sudo mault logs" >&2
fi
exit 1
