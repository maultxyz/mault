#!/bin/bash

pi_print_urls() {
  local addr
  echo "Mault is running at http://127.0.0.1:8080"
  for addr in $(hostname -I 2>/dev/null); do
    case "$addr" in
      *:*|127.*) continue ;;
    esac
    echo "Other computers on this network: http://${addr}:8080"
  done
}

pi_require_user() {
  if [[ "$(id -u)" -eq 0 ]]; then
    echo "Run this as the desktop user. It will ask for your password when it needs root." >&2
    exit 1
  fi
}

pi_ensure_user_bus() {
  local uid user runtime i
  uid="$(id -u)"
  user="${USER:-$(id -un)}"
  runtime="${XDG_RUNTIME_DIR:-/run/user/$uid}"
  export XDG_RUNTIME_DIR="$runtime"

  if ! loginctl show-user "$user" -p Linger 2>/dev/null | grep -q '=yes'; then
    echo "Enabling linger so the Mault services start at boot"
    sudo loginctl enable-linger "$user"
  fi

  if [[ ! -S "$runtime/bus" ]]; then
    sudo systemctl start "user@${uid}.service" || true
    for i in $(seq 1 100); do
      if [[ -S "$runtime/bus" ]]; then
        break
      fi
      sleep 0.1
    done
  fi

  if [[ ! -S "$runtime/bus" ]]; then
    echo "The user session bus is not available at $runtime/bus." >&2
    echo "Install dbus-user-session, then run this script again." >&2
    exit 1
  fi

  export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$runtime/bus}"
}
