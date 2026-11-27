#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if grep -Eq '^[[:space:]]*MAULT_LINK_URL=[^[:space:]]' "$ROOT/.env" 2>/dev/null; then
  exit 0
fi
exec "$ROOT/node/bin/node" --env-file="$ROOT/.env" "$ROOT/packages/server/dist/scripts/sync-prices.js"
