#!/bin/bash
# Builds the self-contained Pi release bundle: Node, the built API with its
# runtime dependencies, the built web app and the Pi helpers. Run on linux-arm64
# (CI uses the Dockerfiles' Node image) so native modules match the Pi.
set -euo pipefail

usage() {
  echo "Usage: $0 --version <x.y.z> --manifest-url <url> --out <directory>" >&2
  exit 1
}

VERSION=""
MANIFEST_URL=""
OUT=""
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --version) VERSION="${2:-}"; shift 2 ;;
    --manifest-url) MANIFEST_URL="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ -n "$VERSION" && -n "$MANIFEST_URL" && -n "$OUT" ]] || usage
[[ "$(uname -m)" == aarch64 ]] || { echo "[bundle] Build on linux-arm64." >&2; exit 1; }

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"

echo "[bundle] Building the web app"
cd "$REPO"
pnpm install --frozen-lockfile --filter "@magic-vault/web..."
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=4096" pnpm --filter @magic-vault/web build

echo "[bundle] Staging the API"
cp "$REPO/package.json" "$REPO/pnpm-lock.yaml" "$REPO/pnpm-workspace.yaml" "$STAGE/"
cp -r "$REPO/patches" "$REPO/drizzle" "$STAGE/"
mkdir -p "$STAGE/packages" "$STAGE/firmware/main" "$STAGE/scripts"
cp -r "$REPO/packages/shared" "$REPO/packages/server" "$STAGE/packages/"
rm -rf "$STAGE/packages/shared/node_modules" "$STAGE/packages/server/node_modules" "$STAGE/packages/server/dist"
cp "$REPO/firmware/main/main.ino" "$STAGE/firmware/main/main.ino"
cp -r "$REPO/scripts/pi" "$STAGE/scripts/pi"
rm -rf "$STAGE/scripts/pi/tests" "$STAGE/scripts/pi/image"
find "$STAGE/scripts/pi" -name "__pycache__" -type d -prune -exec rm -rf {} +
find "$STAGE/scripts/pi" -name "test_*.py" -delete

cd "$STAGE"
pnpm install --frozen-lockfile
pnpm --filter @magic-vault/server build

mkdir -p "$STAGE/packages/web"
cp -r "$REPO/packages/web/dist" "$STAGE/packages/web/dist"
printf '%s\n' 'window.__ENV__ = {"VITE_AUTH_PROVIDER":"local","VITE_APP_ENV":"local","VITE_PI_HOST":"true"};' \
  > "$STAGE/packages/web/dist/env.js"

echo "[bundle] Adding Node $(node -v)"
NODE_VERSION="$(node -v)"
NODE_ARCHIVE="node-${NODE_VERSION}-linux-arm64.tar.xz"
curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}" -o "$STAGE/$NODE_ARCHIVE"
curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt" -o "$STAGE/SHASUMS256.txt"
(cd "$STAGE" && grep " ${NODE_ARCHIVE}\$" SHASUMS256.txt | sha256sum -c -)
mkdir -p "$STAGE/node"
tar -xJf "$STAGE/$NODE_ARCHIVE" -C "$STAGE/node" --strip-components=1
rm -rf "${STAGE:?}/$NODE_ARCHIVE" "$STAGE/SHASUMS256.txt" "$STAGE/node/include" "$STAGE/node/share"

cat > "$STAGE/release.json" <<JSON
{"version":"${VERSION}","nodeVersion":"${NODE_VERSION}","manifestUrl":"${MANIFEST_URL}"}
JSON

echo "[bundle] Packing"
tar -czf "$OUT/mault-pi-arm64.tar.gz" -C "$STAGE" .
SHA256="$(sha256sum "$OUT/mault-pi-arm64.tar.gz" | cut -d' ' -f1)"
cat > "$OUT/manifest.json" <<JSON
{"version":"${VERSION}","bundle":"mault-pi-arm64.tar.gz","sha256":"${SHA256}"}
JSON
sed "s|__MAULT_MANIFEST_URL__|${MANIFEST_URL}|" "$REPO/scripts/pi/install.sh" > "$OUT/install.sh"
echo "[bundle] Wrote $OUT/mault-pi-arm64.tar.gz ($VERSION)"
