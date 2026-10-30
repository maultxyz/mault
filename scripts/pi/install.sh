#!/bin/bash
set -euo pipefail

# Dockerfiles own the application toolchain pins. Use Python so this also
# works on a fresh Pi before Node or pnpm has been installed.
pi_docker_toolchain() {
  python3 - "$1" <<'PY'
import json
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
versions = {"Node": set(), "pnpm": set()}
for name in ("Dockerfile.server", "Dockerfile.web", "Dockerfile.bot", "Dockerfile.api-docs"):
    text = (root / name).read_text()
    nodes = re.findall(r"^FROM\s+node:(\d+)(?:[.\w-]*)(?:\s|$)", text, re.M | re.I)
    pnpms = re.findall(r"^RUN\s+npm\s+install\s+-g\s+pnpm@(\d+\.\d+\.\d+)(?:\s|$)", text, re.M)
    if not nodes or not pnpms:
        sys.exit(f"[dependencies] Cannot read pinned Node and pnpm versions from {name}.")
    versions["Node"].update(nodes)
    versions["pnpm"].update(pnpms)
for name, values in versions.items():
    if len(values) != 1:
        sys.exit(f"[dependencies] Dockerfiles disagree on {name}: {sorted(values)}")
node = next(iter(versions["Node"]))
pnpm = next(iter(versions["pnpm"]))
if json.loads((root / "package.json").read_text()).get("packageManager") != f"pnpm@{pnpm}":
    sys.exit("[dependencies] package.json packageManager must match the Dockerfile pnpm version.")
print(node, pnpm)
PY
}

pi_ensure_toolchain() {
  local root="$1" pins required_node required_pnpm current_node=0 setup_file
  pins="$(pi_docker_toolchain "$root")" || return 1
  read -r required_node required_pnpm <<< "$pins"
  echo "[dependencies] Docker toolchain: Node $required_node, pnpm $required_pnpm"
  if command -v node >/dev/null 2>&1; then
    current_node="$(node -p 'process.versions.node.split(".")[0]')"
  fi
  if [[ "$current_node" != "$required_node" ]]; then
    echo "[dependencies] Installing Node $required_node (current major: $current_node)"
    setup_file="$(mktemp)" || return 1
    if ! curl -fsSL "https://deb.nodesource.com/setup_${required_node}.x" -o "$setup_file"; then
      rm -f "$setup_file"
      return 1
    fi
    if ! sudo -E bash "$setup_file"; then
      rm -f "$setup_file"
      return 1
    fi
    rm -f "$setup_file"
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs || return 1
    hash -r
  fi
  if [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$required_node" ]]; then
    echo "[dependencies] Node on PATH does not match Docker's Node $required_node. Check for a user-installed Node override." >&2
    return 1
  fi
  if ! command -v pnpm >/dev/null 2>&1 || [[ "$(pnpm --version)" != "$required_pnpm" ]]; then
    echo "[dependencies] Installing pnpm $required_pnpm"
    # Replace any Corepack shim left by older Pi installations.
    sudo npm install -g --force "pnpm@$required_pnpm" || return 1
    hash -r
  fi
  if [[ "$(pnpm --version)" != "$required_pnpm" ]]; then
    echo "[dependencies] pnpm on PATH does not match Docker's pnpm $required_pnpm." >&2
    return 1
  fi
}


# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")" && pwd)/session.sh"
pi_require_user

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "[install] Installing system packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  git curl ca-certificates python3 build-essential v4l-utils ffmpeg postgresql dbus-user-session
sudo systemctl enable --now postgresql
pg_major="$(psql --version | awk '{print $3}' | cut -d. -f1)"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "postgresql-${pg_major}-pgvector"

pi_ensure_toolchain "$ROOT"

if [[ ! -f .env ]]; then
  python3 - << 'PY'
import secrets
from pathlib import Path

password = secrets.token_hex(24)
text = f"""AUTH_PROVIDER=local
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
VITE_LATEST_FIRMWARE_VERSION=2.10.0
PI_HOST=1
"""
Path(".env").write_text(text)
Path(".env").chmod(0o600)
print("[install] Wrote .env")
PY
fi

if ! grep -q '^PI_HOST=' .env; then
  printf '\nPI_HOST=1\n' >> .env
  echo "[install] Set PI_HOST=1"
fi

PASSWORD="$(python3 - << 'PY'
from pathlib import Path
for line in Path(".env").read_text().splitlines():
    if line.startswith("POSTGRES_PASSWORD="):
        print(line.split("=", 1)[1])
        break
PY
)"

if [[ -z "$PASSWORD" ]]; then
  echo "POSTGRES_PASSWORD is missing from .env" >&2
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 << SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mault') THEN
    CREATE ROLE mault LOGIN SUPERUSER PASSWORD '${PASSWORD}';
  ELSE
    ALTER ROLE mault WITH LOGIN SUPERUSER PASSWORD '${PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE mault OWNER mault'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mault')\\gexec
SQL
sudo -u postgres psql -d mault -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"

pnpm install
pnpm --filter @magic-vault/server build
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096" pnpm --filter @magic-vault/web build

set -a
# shellcheck disable=SC1091
source .env
set +a
pnpm --filter @magic-vault/server db:migrate-local

echo "[install] Enabling user services"
dialout_members=",$(getent group dialout | cut -d: -f4),"
case "$dialout_members" in
  *,"$USER",*) ;;
  *)
    echo "[install] Adding $USER to dialout"
    sudo usermod -aG dialout "$USER"
    ;;
esac
case " $(id -nG) " in
  *" dialout "*) dialout_active=1 ;;
  *) dialout_active=0 ;;
esac

pi_ensure_user_bus

node "$ROOT/scripts/pi/install-services.mjs" "$ROOT"
systemctl --user daemon-reload
if ! systemctl --user enable --now mault-camera.service mault-api.service mault-web.service; then
  systemctl --user --no-pager --full status mault-api.service mault-web.service mault-camera.service || true
  exit 1
fi
if [[ "$dialout_active" -eq 0 ]]; then
  echo "[install] Restarting user services so they can open the sorter"
  sudo systemctl restart "user@$(id -u).service"
  pi_ensure_user_bus
fi

if ! {
  gdbus call --session \
    --dest org.freedesktop.impl.portal.PermissionStore \
    --object-path /org/freedesktop/impl/portal/PermissionStore \
    --method org.freedesktop.impl.portal.PermissionStore.SetPermission \
    devices true camera '' "['yes']" >/dev/null \
    && gdbus call --session \
      --dest org.freedesktop.impl.portal.PermissionStore \
      --object-path /org/freedesktop/impl/portal/PermissionStore \
      --method org.freedesktop.impl.portal.PermissionStore.SetPermission \
      devices true camera chromium "['yes']" >/dev/null
}; then
  echo "[install] Could not pre-allow the camera. Chromium will ask the first time it opens."
fi

DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
mkdir -p "$DESKTOP"
for action in Start Stop; do
  script="$ROOT/scripts/pi/$(echo "$action" | tr '[:upper:]' '[:lower:]').sh"
  if [[ "$action" == "Start" ]]; then
    icon="/usr/share/pixmaps/chromium.png"
    comment="Start MAULT and open it"
  else
    icon="/usr/share/icons/AdwaitaLegacy/48x48/legacy/process-stop.png"
    comment="Stop MAULT"
  fi
  cat > "$DESKTOP/${action} MAULT.desktop" << EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=${action} MAULT
Comment=${comment}
Exec=lxterminal -t "${action} MAULT" -e bash -lc '${script}; echo; echo "Press Enter to close."; read'
Icon=${icon}
Terminal=false
Categories=Utility;
StartupNotify=false
EOF
  chmod +x "$DESKTOP/${action} MAULT.desktop"
done
gio set "$DESKTOP/Start MAULT.desktop" metadata::trusted true 2>/dev/null || true
gio set "$DESKTOP/Stop MAULT.desktop" metadata::trusted true 2>/dev/null || true

for _ in $(seq 1 60); do
  if curl -sf http://127.0.0.1:8080/ >/dev/null; then
    break
  fi
  sleep 0.5
done

if ! curl -sf http://127.0.0.1:8080/ >/dev/null; then
  echo "[install] The web app did not come up on port 8080." >&2
  systemctl --user --no-pager --full status mault-api.service mault-web.service mault-camera.service || true
  exit 1
fi

echo "[install] Ready."
pi_print_urls
echo "[install] The services also start on boot."