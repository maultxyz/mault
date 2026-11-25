#!/bin/bash
# The `mault` command on Pi installs: sudo mault <command>
# Installed as /usr/local/sbin/mault by secure-layout.sh, never run from a
# release. Release scripts run as root only after trusted-tree.py has checked
# that the service account cannot change them; anything reading the service's
# own files runs as the service account.
set -euo pipefail
if [[ "$EUID" -eq 0 ]]; then export PATH=/usr/sbin:/usr/bin:/sbin:/bin; fi
unset BASH_ENV ENV

MAULT_HOME=/opt/mault
MAULT_LIB=/usr/local/lib/mault
MAULT_DATA=/var/lib/mault
MAULT_USER=mault-service
ROOT="$MAULT_HOME/current"
SCRIPTS="$ROOT/scripts/pi"
SERVICES=(mault-camera.service mault-api.service)

usage() {
  cat <<'EOF'
Usage: sudo mault <command>

  status                 Show whether Mault is running
  start | stop | restart Control the Mault services
  update [--bundle FILE] Install the latest release (or a downloaded bundle)
  os-updates             Turn on automatic OS security updates
  logs [api|camera|controller|update|setup]
                         Show recent log output
  sorter usb|builtin [raspberry-pi|orange-pi-zero4]
                         Choose how the sorter is connected
  hosting mault.xyz|self Keep cards in your Mault account or on this board
  link [--wait]          Show the code that links this board to mault.xyz
  prices                 Refresh card prices now (also runs daily)
  urls                   Show the addresses to open Mault from
  version                Show the installed version
EOF
}

release_field() {
  python3 -I -c 'import json, sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$ROOT/release.json" "$1"
}

require_trusted_release() {
  if [[ ! -f "$MAULT_LIB/trusted-tree.py" ]] ||
    ! python3 -I "$MAULT_LIB/trusted-tree.py" --release "$ROOT" --path /usr/local/sbin/mault --path "$MAULT_LIB"; then
    echo "This Mault installation lets the service account change code that runs as root." >&2
    echo "Reinstall it once with the install.sh from the newest pi-v release (settings and cards stay):" >&2
    echo "  curl -fsSL <release>/install.sh | sudo bash" >&2
    exit 1
  fi
}

run_release_script() {
  require_trusted_release
  bash "$SCRIPTS/$1" "${@:2}"
}

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "Run this with sudo: sudo mault $*" >&2
    exit 1
  fi
}

as_service_user() {
  local uid
  uid="$(id -u "$MAULT_USER")"
  runuser -u "$MAULT_USER" -- env HOME="$MAULT_DATA" XDG_RUNTIME_DIR="/run/user/$uid" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" PATH="$ROOT/node/bin:/usr/bin:/bin" "$@"
}

service_systemctl() {
  as_service_user systemctl --user "$@"
}

all_services() {
  local services=("${SERVICES[@]}")
  if service_systemctl cat mault-controller.service >/dev/null 2>&1 &&
    service_systemctl is-enabled --quiet mault-controller.service; then
    services+=(mault-controller.service)
  fi
  echo "${services[@]}"
}

print_link_status() {
  local attempts=1
  local response
  local status_code
  local status=""
  [[ "${1:-}" == --wait ]] && attempts=30
  for _ in $(seq 1 "$attempts"); do
    response="$(curl -s -w '\n%{http_code}' http://127.0.0.1:8080/api/pi-link/local 2>/dev/null || true)"
    status_code="${response##*$'\n'}"
    case "$status_code" in
      200) status="${response%$'\n'*}" ;;
      404) status='{"data":{"state":"off"}}' ;;
      *) status="" ;;
    esac
    if [[ -n "$status" ]] && python3 -I -c 'import json, sys; data = json.loads(sys.argv[1])["data"]; sys.exit(1 if data["state"] == "pairing" and not data.get("code") else 0)' "$status" 2>/dev/null; then
      break
    fi
    [[ "$attempts" -gt 1 ]] && sleep 1
  done
  python3 -I -c '
import json, sys
try:
    data = json.loads(sys.argv[1])["data"]
except (ValueError, KeyError, TypeError):
    data = {"state": "unreachable"}
if data["state"] == "unreachable":
    print("Mault is not answering yet. Check it with: sudo mault status")
elif data["state"] == "off":
    print("This board keeps cards in its own database. Use your Mault account with: sudo mault hosting mault.xyz")
elif data["state"] == "linked":
    connection = "connected" if data.get("connected") else "not connected right now, check the network"
    name = data.get("hostName", "")
    print(f"Linked to Mault as \"{name}\" ({connection}).")
elif data.get("code"):
    code = data["code"]
    print("Link this sorter to your Mault account: sign in at https://mault.xyz as an owner or admin")
    print(f"and enter the code {code[:4]}-{code[4:]} (a new code appears when it expires).")
else:
    print("Waiting for a link code from mault.xyz. Check the network, then run: sudo mault link")
' "${status:-}"
}

print_urls() {
  local address
  local host
  host="$(hostname)"
  echo "Open Mault in a browser on this network:"
  echo "  http://${host}.local"
  for address in $(hostname -I 2>/dev/null); do
    case "$address" in
      *:*|127.*) continue ;;
    esac
    echo "  http://${address}"
  done
}

command="${1:-}"
shift || true
case "$command" in
  status)
    require_root "$command"
    echo "Mault $(release_field version)"
    # shellcheck disable=SC2046
    service_systemctl --no-pager status $(all_services) || true
    ;;
  start|restart)
    require_root "$command"
    # shellcheck disable=SC2046
    service_systemctl "$command" $(all_services)
    print_urls
    ;;
  stop)
    require_root "$command"
    # shellcheck disable=SC2046
    service_systemctl stop $(all_services)
    echo "Mault stopped. Start it again with: sudo mault start"
    ;;
  update)
    require_root "$command"
    run_release_script update.sh "$@"
    run_release_script secure-layout.sh
    bash "$MAULT_LIB/os-updates.sh" ||
      echo "Could not turn on automatic OS updates. Try again with: sudo mault os-updates" >&2
    ;;
  os-updates)
    require_root "$command"
    bash "$MAULT_LIB/os-updates.sh"
    ;;
  logs)
    require_root "$command"
    case "${1:-api}" in
      api) as_service_user tail -n 200 "$MAULT_DATA/.local/state/mault/api.log" ;;
      update) tail -n 200 /var/lib/mault-system/update.log ;;
      setup) journalctl -u mault-setup.service -n 200 --no-pager ;;
      camera|controller) service_systemctl --no-pager status "mault-$1.service" -n 200 || true ;;
      *) usage; exit 1 ;;
    esac
    ;;
  sorter)
    require_root "$command"
    case "${1:-}" in
      usb) mode=0 ;;
      builtin) mode=1 ;;
      *) usage; exit 1 ;;
    esac
    board="${2:-raspberry-pi}"
    require_trusted_release
    as_service_user sed -i -E '/^\s*(export\s+)?PI_SORTER(_BOARD)?=/d' "$MAULT_DATA/.env"
    PI_SORTER="$mode" PI_SORTER_BOARD="$board" run_release_script setup.sh
    ;;
  hosting)
    require_root "$command"
    case "${1:-}" in
      mault.xyz|hosted) hosting=hosted ;;
      self) hosting=self ;;
      *) usage; exit 1 ;;
    esac
    require_trusted_release
    echo "Cards already scanned stay where they are: they don't move between this board and mault.xyz."
    as_service_user sed -i -E '/^\s*(export\s+)?MAULT_(HOSTING|LINK_URL)=/d' "$MAULT_DATA/.env"
    MAULT_HOSTING="$hosting" run_release_script setup.sh
    ;;
  link)
    print_link_status "${1:-}"
    ;;
  prices)
    require_root "$command"
    service_systemctl start --wait mault-prices.service
    echo "Prices refreshed."
    ;;
  urls)
    print_urls
    ;;
  version)
    release_field version
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
