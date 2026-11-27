#!/bin/bash
# Configures an installed release: secrets, database, sorter mode and services.
# Runs as root on first boot of the SD image (mault-setup.service) and at the
# end of install.sh. Safe to rerun. Root never writes, imports or parses
# anything under /var/lib/mault itself: those steps run as the service account.
set -euo pipefail
if [[ "$EUID" -eq 0 ]]; then export PATH=/usr/sbin:/usr/bin:/sbin:/bin; fi
unset BASH_ENV ENV

MAULT_HOME=/opt/mault
MAULT_DATA=/var/lib/mault
MAULT_SYSTEM_STATE=/var/lib/mault-system
MAULT_LIB=/usr/local/lib/mault
BOOT_CONFIG=/boot/firmware/mault-config.txt
MAULT_USER=mault-service
ROOT="$MAULT_HOME/current"
SCRIPTS="$ROOT/scripts/pi"
ENV_FILE="$MAULT_DATA/.env"

FIRST_BOOT=0
MIGRATE_FROM=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --first-boot) FIRST_BOOT=1; shift ;;
    --migrate-from) MIGRATE_FROM="${2:-}"; shift 2 ;;
    *) echo "Usage: $0 [--first-boot] [--migrate-from DIR]" >&2; exit 1 ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run setup with sudo." >&2
  exit 1
fi

as_service_user() {
  local uid
  uid="$(id -u "$MAULT_USER")"
  runuser -u "$MAULT_USER" -- env HOME="$MAULT_DATA" XDG_RUNTIME_DIR="/run/user/$uid" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" PATH="$ROOT/node/bin:/usr/bin:/bin" "$@"
}

interactive() {
  [[ "$FIRST_BOOT" -eq 0 ]] && { : </dev/tty; } 2>/dev/null
}

install_mode_arguments=(--env "$ENV_FILE")
if [[ -f "$MAULT_SYSTEM_STATE/setup-complete" || -n "$MIGRATE_FROM" ]]; then
  install_mode_arguments+=(--existing-install)
fi
if [[ "$FIRST_BOOT" -eq 1 && -z "${MAULT_HOSTING:-}" && -f "$MAULT_LIB/boot-config.py" ]]; then
  MAULT_HOSTING="$(python3 -I "$MAULT_LIB/boot-config.py" --print-hosting "$BOOT_CONFIG")"
  export MAULT_HOSTING="${MAULT_HOSTING:-hosted}"
fi

if [[ -f "$ENV_FILE" ]]; then
  bash "$SCRIPTS/install.sh" --read-postgres-password "$ENV_FILE" >/dev/null
elif [[ -n "$MIGRATE_FROM" ]]; then
  bash "$SCRIPTS/install.sh" --read-postgres-password "$MIGRATE_FROM/.env" >/dev/null
fi

if [[ -n "$MIGRATE_FROM" && ! -f "$ENV_FILE" ]]; then
  echo "[setup] Moving settings from $MIGRATE_FROM"
  old_user="$(stat -c %U "$MIGRATE_FROM")"
  old_home="$(getent passwd "$old_user" | cut -d: -f6)"
  grep -v -E '^\s*(export\s+)?PI_CONTROLLER_(SOCKET|CONFIG)=' "$MIGRATE_FROM/.env" |
    runuser -u "$MAULT_USER" -- sh -c 'umask 077 && cat > "$1"' sh "$ENV_FILE"
  copy_into_service_data() {
    if [[ -e "$1/$2" ]]; then
      tar -C "$1" -cf - "$2" | runuser -u "$MAULT_USER" -- tar -C "$MAULT_DATA/$3" --no-same-owner -xf -
    fi
  }
  runuser -u "$MAULT_USER" -- mkdir -p "$MAULT_DATA/.local/state" "$MAULT_DATA/.cache"
  copy_into_service_data "$MIGRATE_FROM" .pi-controller/calibration.json .
  copy_into_service_data "$old_home/.local/state" mault .local/state
  copy_into_service_data "$MIGRATE_FROM/.cache" collectorvision .cache
  systemctl --user --machine="$old_user@.host" disable --now \
    mault-web.service mault-api.service mault-camera.service mault-controller.service 2>/dev/null || true
  echo "[setup] The old checkout at $MIGRATE_FROM is no longer used. Delete it once Mault is running."
fi

if [[ ! -f "$ENV_FILE" ]]; then
  as_service_user python3 - "$ENV_FILE" <<'PY'
import secrets
import sys
from pathlib import Path

password = secrets.token_hex(24)
path = Path(sys.argv[1])
path.write_text(f"""AUTH_PROVIDER=local
VITE_AUTH_PROVIDER=local
DATABASE_URL=postgresql://mault:{password}@127.0.0.1:5432/mault
DATABASE_SSL=false
POSTGRES_PASSWORD={password}
OWN_AUTH_TOKEN_PEPPER={secrets.token_hex(32)}
IMPERSONATION_SECRET={secrets.token_hex(32)}
MONITOR_LINK_SECRET={secrets.token_hex(32)}
WEB_URL=http://127.0.0.1:8080
PORT=3001
VITE_APP_ENV=local
PI_HOST=1
""")
path.chmod(0o600)
print("[setup] Wrote new secrets")
PY
fi

if ! as_service_user grep -q -E '^\s*(export\s+)?PI_SORTER=' "$ENV_FILE" && ! interactive; then
  if [[ -z "${PI_SORTER:-}" ]]; then
    if python3 -I "$SCRIPTS/detect-sorter.py"; then
      echo "[setup] Found a servo driver on the I2C header: this board controls the sorter."
      export PI_SORTER=1 PI_SORTER_BOARD=raspberry-pi
    else
      echo "[setup] No servo driver on the I2C header: the sorter connects over USB or Bluetooth."
      export PI_SORTER=0
    fi
  fi
fi
if interactive; then
  as_service_user python3 "$SCRIPTS/install-mode.py" "${install_mode_arguments[@]}" </dev/tty
else
  as_service_user python3 "$SCRIPTS/install-mode.py" "${install_mode_arguments[@]}"
fi
hosting_mode="$(as_service_user python3 "$SCRIPTS/install-mode.py" --env "$ENV_FILE" --print-hosting)"
if [[ -z "${CARD_API_USER_AGENT:-}" ]]; then
  CARD_API_USER_AGENT="Mault-$(hostname | tr -c 'A-Za-z0-9._\n-' '-')-$(python3 -I -c 'import secrets; print(secrets.token_hex(4))')/1.0"
fi
CARD_API_USER_AGENT="$CARD_API_USER_AGENT" as_service_user python3 "$SCRIPTS/install-user-agent.py" --env "$ENV_FILE"

sorter_mode="$(as_service_user python3 "$SCRIPTS/install-mode.py" --env "$ENV_FILE" --print-mode)"
sorter_board="$(as_service_user python3 "$SCRIPTS/install-mode.py" --env "$ENV_FILE" --print-board)"
if [[ "$sorter_mode" == gpio && "$sorter_board" == orange-pi-zero4 ]]; then
  as_service_user python3 -I -c 'import sys; sys.path.insert(0, sys.argv[1]); from scripts.pi.controller.hardware import require_zero4; require_zero4()' "$ROOT"
  DEBIAN_FRONTEND=noninteractive apt-get install -y python3-libgpiod
  if ! python3 -I -c 'import gpiod; from gpiod.line import Bias, Direction, Value; assert callable(gpiod.request_lines)'; then
    echo "[setup] Orange Pi Zero 4 requires libgpiod v2 Python bindings from the system packages." >&2
    exit 1
  fi
  groupadd -f gpio
  groupadd -f i2c
  usermod -aG gpio,i2c "$MAULT_USER"
  cat > /etc/udev/rules.d/70-mault-zero4.rules <<'RULES'
SUBSYSTEM=="gpio", KERNEL=="gpiochip*", KERNELS=="2000000.pinctrl", GROUP="gpio", MODE="0660"
SUBSYSTEM=="i2c-dev", KERNEL=="i2c-*", KERNELS=="2510000.twi", GROUP="i2c", MODE="0660"
RULES
  udevadm control --reload-rules
  udevadm trigger --action=change --subsystem-match=gpio --parent-match=/sys/bus/platform/devices/2000000.pinctrl
  if [[ -e /sys/bus/platform/devices/2510000.twi ]]; then
    udevadm trigger --action=change --subsystem-match=i2c-dev --parent-match=/sys/bus/platform/devices/2510000.twi
  else
    echo "[setup] Zero 4 header TWI0 needs the i2c0 boot overlay. Enable it and reboot before using the sorter."
  fi
  udevadm settle
fi

if [[ "$hosting_mode" == hosted ]]; then
  echo "[setup] Cards are kept in your Mault account at mault.xyz: the local database stays off."
  systemctl disable --now postgresql 2>/dev/null || true
else
  password="$(bash "$SCRIPTS/install.sh" --read-postgres-password "$ENV_FILE")"

  echo "[setup] Preparing the database"
  systemctl enable --now postgresql
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mault') THEN
    CREATE ROLE mault LOGIN SUPERUSER PASSWORD '${password}';
  ELSE
    ALTER ROLE mault WITH LOGIN SUPERUSER PASSWORD '${password}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE mault OWNER mault'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mault')\\gexec
SQL
  runuser -u postgres -- psql -d mault -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"
fi

echo "[setup] Starting Mault"
loginctl enable-linger "$MAULT_USER"
systemctl start "user@$(id -u "$MAULT_USER").service"
for _ in $(seq 1 100); do
  [[ -S "/run/user/$(id -u "$MAULT_USER")/bus" ]] && break
  sleep 0.1
done
as_service_user node "$SCRIPTS/install-services.mjs" "$ROOT"
as_service_user systemctl --user daemon-reload
services=(mault-camera.service mault-api.service)
if [[ "$sorter_mode" == gpio ]]; then
  services+=(mault-controller.service)
elif as_service_user systemctl --user cat mault-controller.service >/dev/null 2>&1; then
  as_service_user systemctl --user disable --now mault-controller.service
fi
as_service_user systemctl --user enable "${services[@]}"
as_service_user systemctl --user restart "${services[@]}"
if [[ "$hosting_mode" == hosted ]]; then
  as_service_user systemctl --user disable --now mault-prices.timer 2>/dev/null || true
else
  as_service_user systemctl --user enable --now mault-prices.timer
fi
systemctl reload-or-restart nginx

for _ in $(seq 1 120); do
  if curl -sf http://127.0.0.1:8080/api/public/version >/dev/null; then
    touch "$MAULT_SYSTEM_STATE/setup-complete"
    bash "$SCRIPTS/mault.sh" urls
    if [[ "$hosting_mode" == hosted ]]; then
      bash "$SCRIPTS/mault.sh" link --wait
    fi
    exit 0
  fi
  sleep 1
done
echo "[setup] Mault did not start. Check the logs with: sudo mault logs" >&2
exit 1
