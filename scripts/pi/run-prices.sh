#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec "$ROOT/node/bin/node" --env-file="$ROOT/.env" "$ROOT/packages/server/dist/scripts/sync-prices.js"
