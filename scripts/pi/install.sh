#!/bin/bash
# Installs Mault from a prebuilt release bundle. Nothing is cloned or built on
# the board. Also runs inside the SD image build (--image) and fetches releases
# for the updater (--fetch-only).
#
#   curl -fsSL <release>/install.sh | sudo bash
#   sudo bash install.sh --bundle mault-pi-arm64.tar.gz
set -euo pipefail
if [[ "$EUID" -eq 0 ]]; then export PATH=/usr/sbin:/usr/bin:/sbin:/bin; fi
unset BASH_ENV ENV

MAULT_HOME="${MAULT_HOME:-/opt/mault}"
MAULT_DATA="${MAULT_DATA:-/var/lib/mault}"
MAULT_USER=mault-service
LEGACY_MAULT_COMMAND=/usr/local/bin/mault
DEFAULT_MANIFEST_URL="__MAULT_MANIFEST_URL__"

usage() {
  cat >&2 <<'EOF'
Usage: install.sh [--bundle FILE] [--manifest-url URL] [--migrate-from DIR]
       install.sh --image --bundle FILE
       install.sh --fetch-only [--bundle FILE] [--manifest-url URL]
EOF
  exit 1
}

BUNDLE=""
MANIFEST_URL=""
MODE=install
MIGRATE_FROM=""
ENV_TO_CHECK=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --read-postgres-password) ENV_TO_CHECK="${2:-}"; MODE=check; shift 2 ;;
    --bundle) BUNDLE="${2:-}"; shift 2 ;;
    --manifest-url) MANIFEST_URL="${2:-}"; shift 2 ;;
    --migrate-from) MIGRATE_FROM="${2:-}"; shift 2 ;;
    --image) MODE=image; shift ;;
    --fetch-only) MODE=fetch; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

# Root never parses the service account's own files: a .env under MAULT_DATA is
# read as that account. An old checkout's .env belongs to its login user.
read_postgres_password() {
  local reader=()
  if [[ "$EUID" -eq 0 && "$1" == "$MAULT_DATA/"* ]]; then
    reader=(runuser -u "$MAULT_USER" --)
  fi
  "${reader[@]}" python3 -I - "$1" <<'PYENV'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
try:
    value = ""
    for line in path.read_text().splitlines():
        match = re.fullmatch(r"\s*(?:export\s+)?POSTGRES_PASSWORD\s*=\s*(.*?)\s*", line)
        if match:
            password_match = re.fullmatch(
                r"\s*(?:\"([A-Za-z0-9]+)\"|'([A-Za-z0-9]+)'|([A-Za-z0-9]+))\s*(?:#.*)?",
                match[1],
            )
            value = next((part for part in password_match.groups() if part), "") if password_match else ""
    if not re.fullmatch(r"[A-Za-z0-9]+", value):
        raise ValueError()
except (OSError, ValueError):
    sys.exit(f"[install] POSTGRES_PASSWORD in {path} must contain a non-empty alphanumeric value, optionally quoted. Existing services have not been stopped.")
print(value)
PYENV
}

if [[ "$MODE" == check ]]; then
  read_postgres_password "$ENV_TO_CHECK"
  exit 0
fi

release_field() {
  python3 -I -c 'import json, sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$1" "$2"
}

# Root may adopt /opt/mault only when the service account never could change
# it: older installs made it service-owned, so anything in it may have been
# replaced. Such a tree is never re-owned or run, only deleted; settings and
# cards live in /var/lib/mault and stay.
remove_untrusted_install() {
  if [[ ! -e "$MAULT_HOME" && ! -L "$MAULT_HOME" ]]; then
    return 0
  fi
  if [[ ! -L "$MAULT_HOME" && "$(stat -c %u "$MAULT_HOME")" == 0 &&
    -z "$(find "$MAULT_HOME" \( ! -user root -o \( ! -type l -perm /022 \) \) -print -quit)" ]]; then
    return 0
  fi
  echo "[install] $MAULT_HOME was writable by the Mault service account. Replacing its releases; settings and cards stay."
  if id "$MAULT_USER" >/dev/null 2>&1; then
    systemctl --user --machine="$MAULT_USER@.host" stop \
      mault-api.service mault-camera.service mault-controller.service mault-prices.timer 2>/dev/null || true
  fi
  rm -f "$LEGACY_MAULT_COMMAND"
  rm -rf "$MAULT_HOME"
}

# Prints the release directory of the fetched or unpacked bundle on stdout.
fetch_release() {
  local work manifest_url bundle_url expected actual version target
  umask 022
  mkdir -p "$MAULT_HOME/releases"
  work="$(mktemp -d "$MAULT_HOME/releases/.incoming.XXXXXX")"
  trap 'rm -rf "$work"' RETURN
  if [[ -z "$BUNDLE" ]]; then
    manifest_url="${MANIFEST_URL:-$DEFAULT_MANIFEST_URL}"
    if [[ "$manifest_url" != https://* ]]; then
      echo "[install] No release manifest URL. Pass --bundle or --manifest-url." >&2
      return 1
    fi
    echo "[install] Checking $manifest_url" >&2
    curl -fsSL "$manifest_url" -o "$work/manifest.json"
    bundle_url="$(python3 -I -c 'import json, sys, urllib.parse; m = json.load(open(sys.argv[1])); print(urllib.parse.urljoin(sys.argv[2], m["bundle"]))' "$work/manifest.json" "$manifest_url")"
    expected="$(release_field "$work/manifest.json" sha256)"
    echo "[install] Downloading Mault $(release_field "$work/manifest.json" version)" >&2
    curl -fL --progress-bar "$bundle_url" -o "$work/bundle.tar.gz"
    actual="$(sha256sum "$work/bundle.tar.gz" | cut -d' ' -f1)"
    if [[ "$actual" != "$expected" ]]; then
      echo "[install] The download is corrupt (checksum mismatch). Try again." >&2
      return 1
    fi
    BUNDLE="$work/bundle.tar.gz"
  fi
  mkdir "$work/release"
  tar -xzf "$BUNDLE" -C "$work/release" --no-same-owner
  version="$(release_field "$work/release/release.json" version)"
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-dev\.[0-9]+)?$ ]]; then
    echo "[install] The bundle has no valid version." >&2
    return 1
  fi
  target="$MAULT_HOME/releases/$version"
  if [[ -e "$target" && "$(readlink -f "$MAULT_HOME/current" 2>/dev/null)" == "$(readlink -f "$target")" ]]; then
    echo "$target"
    return 0
  fi
  rm -rf "$target"
  ln -s "$MAULT_DATA/.env" "$work/release/.env"
  ln -s "$MAULT_DATA/.pi-controller" "$work/release/.pi-controller"
  chmod -R go-w,a+rX "$work/release"
  mv "$work/release" "$target"
  echo "$target"
}

if [[ "$MODE" == fetch ]]; then
  fetch_release
  exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run the installer with sudo." >&2
  exit 1
fi
if [[ "$(uname -m)" != aarch64 ]]; then
  echo "Mault needs a 64-bit (arm64) OS. Flash the 64-bit Raspberry Pi OS or your board's arm64 image." >&2
  exit 1
fi

if [[ "$MODE" != image ]]; then
  if [[ -z "$MIGRATE_FROM" && -n "${SUDO_USER:-}" ]]; then
    old_checkout="$(getent passwd "$SUDO_USER" | cut -d: -f6)/mault"
    if [[ -f "$old_checkout/.env" && -f "$old_checkout/scripts/pi/install.sh" ]]; then
      MIGRATE_FROM="$old_checkout"
    fi
  fi
  if [[ -f "$MAULT_DATA/.env" ]]; then
    read_postgres_password "$MAULT_DATA/.env" >/dev/null
  elif [[ -n "$MIGRATE_FROM" ]]; then
    read_postgres_password "$MIGRATE_FROM/.env" >/dev/null
  fi
fi

board_model="$(tr -d '\0' < /proc/device-tree/model 2>/dev/null || true)"
is_raspberry_pi=0
if [[ "$MODE" == image || "$board_model" == *"Raspberry Pi"* ]]; then
  is_raspberry_pi=1
fi

echo "[install] Installing system packages"
packages=(curl ca-certificates libatomic1 python3 python3-smbus v4l-utils ffmpeg postgresql nginx
  bluez python3-bleak dbus-user-session avahi-daemon unattended-upgrades)
if [[ "$is_raspberry_pi" -eq 1 ]]; then
  packages+=(python3-lgpio)
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y "${packages[@]}"
pg_major="$(ls /usr/lib/postgresql | sort -n | tail -1)"
apt-get install -y "postgresql-${pg_major}-pgvector"

echo "[install] Creating the $MAULT_USER account"
if ! id "$MAULT_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$MAULT_DATA" --create-home --shell /usr/sbin/nologin "$MAULT_USER"
fi
for group in video dialout gpio i2c bluetooth; do
  if getent group "$group" >/dev/null; then
    usermod -aG "$group" "$MAULT_USER"
  fi
done
install -d -o "$MAULT_USER" -g "$MAULT_USER" -m 700 "$MAULT_DATA"
runuser -u "$MAULT_USER" -- install -d -m 700 "$MAULT_DATA/.pi-controller"
remove_untrusted_install
install -d -o root -g root -m 755 "$MAULT_HOME" "$MAULT_HOME/releases"

release="$(fetch_release)"
ln -sfn "$release" "$MAULT_HOME/current.new"
mv -T "$MAULT_HOME/current.new" "$MAULT_HOME/current"

echo "[install] Configuring the web server"
install -m 644 "$MAULT_HOME/current/scripts/pi/nginx-mault.conf" /etc/nginx/sites-available/mault
ln -sfn /etc/nginx/sites-available/mault /etc/nginx/sites-enabled/mault
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx postgresql bluetooth avahi-daemon

if [[ "$is_raspberry_pi" -eq 1 ]]; then
  config_txt=/boot/firmware/config.txt
  [[ -f "$config_txt" ]] || config_txt=/boot/config.txt
  if [[ -f "$config_txt" ]] && ! grep -q '^dtparam=i2c_arm=on' "$config_txt"; then
    echo "dtparam=i2c_arm=on" >> "$config_txt"
  fi
  grep -qx 'i2c-dev' /etc/modules 2>/dev/null || echo "i2c-dev" >> /etc/modules
fi

bash "$MAULT_HOME/current/scripts/pi/secure-layout.sh"
bash /usr/local/lib/mault/os-updates.sh

if [[ "$MODE" == image ]]; then
  systemctl enable mault-setup.service
  install -m 644 "$MAULT_HOME/current/scripts/pi/mault-config.txt" /boot/firmware/mault-config.txt
  echo "[install] Image prepared. Mault finishes setting up on first boot."
  exit 0
fi

setup_arguments=()
if [[ -n "$MIGRATE_FROM" ]]; then
  setup_arguments+=(--migrate-from "$MIGRATE_FROM")
fi
systemctl daemon-reload
systemctl reload-or-restart nginx
exec bash "$MAULT_HOME/current/scripts/pi/setup.sh" "${setup_arguments[@]}"
