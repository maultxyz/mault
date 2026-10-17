#!/bin/sh
# Writes the web app's runtime config (window.__ENV__) from the container's
# environment, so the published image carries no deployment-specific values.
# Runs from nginx's /docker-entrypoint.d before nginx starts.
set -eu

out=/usr/share/nginx/html/env.js
json=""
for name in VITE_API_URL VITE_AUTH_PROVIDER VITE_NEON_AUTH_URL VITE_NEON_DATA_API_URL VITE_APP_ENV VITE_ROLLBAR_ACCESS_TOKEN VITE_SHOW_SCAN_LOGS VITE_API_DOCS_URL; do
  value=$(printenv "$name" || true)
  value=$(printf '%s' "$value" | tr -d '\r\n')
  if [ -n "$value" ]; then
    escaped=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')
    json="$json${json:+,}\"$name\":\"$escaped\""
  fi
done
printf 'window.__ENV__ = {%s};\n' "$json" > "$out"
