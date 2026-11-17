#!/bin/bash
# Installs Mault from a prebuilt release bundle. Nothing is cloned or built on
# the board. Also runs inside the SD image build (--image) and fetches releases
# for the updater (--fetch-only).
#
#   curl -fsSL <release>/install.sh | sudo bash
#   sudo bash install.sh --bundle mault-pi-arm64.tar.gz
set -euo pipefail

MAULT_HOME="${MAULT_HOME:-/opt/mault}"
MAULT_DATA="${MAULT_DATA:-/var/lib/mault}"
MAULT_USER=mault-service
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
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --bundle) BUNDLE="${2:-}"; shift 2 ;;
    --manifest-url) MANIFEST_URL="${2:-}"; shift 2 ;;
    --migrate-from) MIGRATE_FROM="${2:-}"; shift 2 ;;
    --image) MODE=image; shift ;;
    --fetch-only) MODE=fetch; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

release_field() {
  python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$1" "$2"
}

# Prints the release directory of the fetched or unpacked bundle on stdout.
fetch_release() {
  local work manifest_url bundle_url expected actual version target
  umask 022
  mkdir -p "$MAULT_HOME/releases"
  work="$(mktemp -d "$MAULT_HOME/releases/.incoming.XXXXXX")"
  trap 'rm -rf "$work"' RETURN
  if [[ -z "$BUNDLE" ]]; then
    manifest_url="${MANIFEST_URL:-}"
    if [[ -z "$manifest_url" && -f "$MAULT_HOME/current/release.json" ]]; then
      manifest_url="$(release_field "$MAULT_HOME/current/release.json" manifestUrl)"
    fi
    manifest_url="${manifest_url:-$DEFAULT_MANIFEST_URL}"
    if [[ "$manifest_url" != https://* ]]; then
      echo "[install] No release manifest URL. Pass --bundle or --manifest-url." >&2
      return 1
    fi
    echo "[install] Checking $manifest_url" >&2
    curl -fsSL "$manifest_url" -o "$work/manifest.json"
    bundle_url="$(python3 -c 'import json, sys, urllib.parse; m = json.load(open(sys.argv[1])); print(urllib.parse.urljoin(sys.argv[2], m["bundle"]))' "$work/manifest.json" "$manifest_url")"
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
  mv "$work/release" "$target"
  if [[ "$(id -u)" -eq 0 ]] && id "$MAULT_USER" >/dev/null 2>&1; then
    chown -R "$MAULT_USER:$MAULT_USER" "$target"
  fi
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

board_model="$(tr -d '\0' < /proc/device-tree/model 2>/dev/null || true)"
is_raspberry_pi=0
if [[ "$MODE" == image || "$board_model" == *"Raspberry Pi"* ]]; then
  is_raspberry_pi=1
fi

echo "[install] Installing system packages"
packages=(curl ca-certificates python3 python3-smbus v4l-utils ffmpeg postgresql nginx
  bluez python3-bleak dbus-user-session avahi-daemon)
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
install -d -o "$MAULT_USER" -g "$MAULT_USER" -m 700 "$MAULT_DATA" "$MAULT_DATA/.pi-controller"
install -d -o "$MAULT_USER" -g "$MAULT_USER" -m 755 "$MAULT_HOME" "$MAULT_HOME/releases"

release="$(fetch_release)"
ln -sfn "$release" "$MAULT_HOME/current.new"
mv -T "$MAULT_HOME/current.new" "$MAULT_HOME/current"
chown -h "$MAULT_USER:$MAULT_USER" "$MAULT_HOME/current"
chmod 755 "$MAULT_HOME/current/scripts/pi/mault.sh"
ln -sfn "$MAULT_HOME/current/scripts/pi/mault.sh" /usr/local/bin/mault

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

install -m 644 "$MAULT_HOME/current/scripts/pi/mault-setup.service" /etc/systemd/system/mault-setup.service

if [[ "$MODE" == image ]]; then
  systemctl enable mault-setup.service
  echo "[install] Image prepared. Mault finishes setting up on first boot."
  exit 0
fi

if [[ -z "$MIGRATE_FROM" && -n "${SUDO_USER:-}" ]]; then
  old_checkout="$(getent passwd "$SUDO_USER" | cut -d: -f6)/mault"
  if [[ -f "$old_checkout/.env" && -f "$old_checkout/scripts/pi/install.sh" ]]; then
    MIGRATE_FROM="$old_checkout"
  fi
fi
setup_arguments=()
if [[ -n "$MIGRATE_FROM" ]]; then
  setup_arguments+=(--migrate-from "$MIGRATE_FROM")
fi
systemctl daemon-reload
systemctl reload-or-restart nginx
exec bash "$MAULT_HOME/current/scripts/pi/setup.sh" "${setup_arguments[@]}"
