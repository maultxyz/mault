#!/bin/bash
set -euo pipefail

main() {
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
  source "$ROOT/scripts/pi/session.sh"
  pi_require_user
  cd "$ROOT"

  for command in git pnpm node curl systemctl; do
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

  pi_ensure_user_bus
  services=(mault-web.service mault-api.service mault-camera.service)
  update_incomplete() {
    echo "[update] Update failed. Services may be stopped; resolve the error and rerun this script." >&2
  }
  trap update_incomplete ERR

  echo "[update] Stopping Mault. Finish any scan before running this updater."
  systemctl --user stop "${services[@]}"
  git merge --ff-only '@{upstream}'
  pnpm install --frozen-lockfile
  pnpm --filter @magic-vault/server build
  pnpm --filter @magic-vault/web build

  node "$ROOT/scripts/pi/install-services.mjs" "$ROOT"
  systemctl --user daemon-reload
  systemctl --user reset-failed "${services[@]}"
  systemctl --user start --no-block mault-camera.service mault-api.service mault-web.service

  for _ in $(seq 1 60); do
    if systemctl --user is-active --quiet mault-api.service &&
      systemctl --user is-active --quiet mault-web.service &&
      systemctl --user is-active --quiet mault-camera.service &&
      curl -fsS --max-time 5 http://127.0.0.1:3001/public/version >/dev/null &&
      curl -fsS --max-time 5 http://127.0.0.1:8080/ >/dev/null; then
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
