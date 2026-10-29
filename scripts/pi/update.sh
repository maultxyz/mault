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


main() {
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  source "$ROOT/scripts/pi/session.sh"
  pi_require_user
  cd "$ROOT"

  for command in git python3 curl systemctl; do
    if ! command -v "$command" >/dev/null 2>&1; then
      echo "[update] Missing $command. Run scripts/pi/install.sh first." >&2
      exit 1
    fi
  done

  if [[ ! -f .env ]]; then
    echo "[update] Missing .env. Run scripts/pi/install.sh first." >&2
    exit 1
  fi
  if ! git symbolic-ref --quiet HEAD >/dev/null; then
    echo "[update] Check out the installed branch before updating." >&2
    exit 1
  fi
  if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
    echo "[update] Local changes found. Commit or stash them before updating:" >&2
    git status --short >&2
    exit 1
  fi
  if ! upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)"; then
    echo "[update] This branch has no tracking branch. Configure its upstream first." >&2
    exit 1
  fi
  remote="$(git config --get "branch.$(git branch --show-current).remote")"
  echo "[update] Fetching $upstream"
  git fetch "$remote"
  if ! git merge-base --is-ancestor HEAD '@{upstream}'; then
    echo "[update] Local commits differ from $upstream. Reconcile them before updating." >&2
    exit 1
  fi

  # Prepare dependencies while the currently installed app is still running.
  # sudo failures must not take the app offline.
  git merge --ff-only '@{upstream}'
  pi_ensure_toolchain "$ROOT"
  pi_ensure_user_bus
  services=(mault-web.service mault-api.service mault-camera.service)
  update_incomplete() {
    echo "[update] Update failed. Services may be stopped; resolve the error and rerun this script." >&2
  }
  trap update_incomplete ERR

  echo "[update] Stopping Mault. Finish any scan before running this updater."
  systemctl --user stop "${services[@]}"
  pnpm install --frozen-lockfile
  pnpm --filter @magic-vault/server build
  NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096" pnpm --filter @magic-vault/web build

  node "$ROOT/scripts/pi/install-services.mjs" "$ROOT"
  systemctl --user daemon-reload
  for unit in "${services[@]}"; do
    if systemctl --user is-failed --quiet "$unit"; then
      systemctl --user reset-failed "$unit"
    fi
  done
  systemctl --user start --no-block mault-camera.service mault-api.service mault-web.service

  for _ in $(seq 1 60); do
    if systemctl --user is-active --quiet mault-api.service &&
      systemctl --user is-active --quiet mault-web.service &&
      systemctl --user is-active --quiet mault-camera.service &&
      curl -fs --max-time 5 http://127.0.0.1:3001/public/version >/dev/null &&
      curl -fs --max-time 5 http://127.0.0.1:8080/ >/dev/null; then
      trap - ERR
      echo "[update] Mault $(node -p 'require("./package.json").version') is running. Reload your browsers."
      exit 0
    fi
    sleep 2
  done

  echo "[update] Services did not become ready. Check service status and the API log." >&2
  systemctl --user --no-pager --full status "${services[@]}" || true
  exit 1
}

main "$@"