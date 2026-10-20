#!/bin/bash
set -euo pipefail

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

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
fi
if [[ "$node_major" -lt 22 ]]; then
  echo "[install] Installing Node 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

if ! command -v pnpm >/dev/null 2>&1 || [[ "$(pnpm -v)" != "9.1.3" ]]; then
  echo "[install] Installing pnpm"
  sudo corepack enable
  sudo env COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack prepare pnpm@9.1.3 --activate
fi
hash -r

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
pnpm --filter @magic-vault/web build

set -a
# shellcheck disable=SC1091
source .env
set +a
pnpm --filter @magic-vault/server db:migrate-local

echo "[install] Enabling user services"
pi_ensure_user_bus

UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$UNIT_DIR"
for unit in mault-api.service mault-web.service mault-camera.service; do
  cp "$ROOT/scripts/pi/$unit" "$UNIT_DIR/$unit"
done
systemctl --user daemon-reload
if ! systemctl --user enable --now mault-camera.service mault-api.service mault-web.service; then
  systemctl --user --no-pager --full status mault-api.service mault-web.service mault-camera.service || true
  exit 1
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

echo "[install] Ready. Open http://<this-pi>:8080 from another computer. The services also start on boot."
