#!/bin/bash
# The `mault` command on Pi installs: sudo mault <command>
set -euo pipefail

MAULT_HOME=/opt/mault
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
  logs [api|camera|controller|update|setup]
                         Show recent log output
  sorter usb|builtin [raspberry-pi|orange-pi-zero4]
                         Choose how the sorter is connected
  prices                 Refresh card prices now (also runs daily)
  urls                   Show the addresses to open Mault from
  version                Show the installed version
EOF
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
    echo "Mault $(python3 -c 'import json; print(json.load(open("/opt/mault/current/release.json"))["version"])')"
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
    as_service_user bash "$SCRIPTS/update.sh" "$@"
    ;;
  logs)
    require_root "$command"
    case "${1:-api}" in
      api) tail -n 200 "$MAULT_DATA/.local/state/mault/api.log" ;;
      update) tail -n 200 "$MAULT_DATA/.local/state/mault/update.log" ;;
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
    sed -i -E '/^\s*(export\s+)?PI_SORTER(_BOARD)?=/d' "$MAULT_DATA/.env"
    PI_SORTER="$mode" PI_SORTER_BOARD="$board" bash "$SCRIPTS/setup.sh"
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
    python3 -c 'import json; print(json.load(open("/opt/mault/current/release.json"))["version"])'
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
