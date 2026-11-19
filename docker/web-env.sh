#!/bin/sh
# Writes the web app's runtime config (window.__ENV__) from the container's
# environment, so the published image carries no deployment-specific values.
# Runs from nginx's /docker-entrypoint.d before nginx starts.
set -eu

# Neon Auth base URL for nginx.conf's /neon-auth/ proxy and
# /auth/mobile-start; empty (or a value nginx can't quote safely) turns both
# off and the web client calls Neon Auth directly.
neon_auth_url=$(printenv VITE_NEON_AUTH_URL || true)
case "$neon_auth_url" in
  https://*)
    if printf '%s' "$neon_auth_url" | grep -q '[[:space:]";{}$\\]'; then
      neon_auth_url=""
    fi
    ;;
  *) neon_auth_url="" ;;
esac
printf 'set $neon_auth_url "%s";\n' "${neon_auth_url%/}" > /etc/nginx/neon-auth.conf

out=/usr/share/nginx/html/env.js
json=""
for name in VITE_API_URL VITE_AUTH_PROVIDER VITE_NEON_AUTH_URL VITE_NEON_DATA_API_URL VITE_APP_ENV VITE_BETTER_STACK_ERRORS_DSN VITE_SHOW_SCAN_LOGS VITE_API_DOCS_URL; do
  value=$(printenv "$name" || true)
  value=$(printf '%s' "$value" | tr -d '\r\n')
  if [ -n "$value" ]; then
    escaped=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')
    json="$json${json:+,}\"$name\":\"$escaped\""
  fi
done
if [ -n "$neon_auth_url" ]; then
  json="$json${json:+,}\"VITE_NEON_AUTH_PROXY_PATH\":\"/neon-auth\""
fi
printf 'window.__ENV__ = {%s};\n' "$json" > "$out"

# Upstream for share link previews (nginx.conf's /__share_preview).
# SHARE_PREVIEW_API_URL is the API base this container can reach (e.g.
# https://example.com/api when the platform proxy routes /api to the API
# instead of this nginx); else an absolute VITE_API_URL is called the way the
# browser calls it; else the compose stack's API container. A value nginx
# can't quote safely is skipped.
is_safe_http_url() {
  case "$1" in
    http://*|https://*) ! printf '%s' "$1" | grep -q '[[:space:]";{}$\\]' ;;
    *) return 1 ;;
  esac
}
share_preview_api_url=$(printenv SHARE_PREVIEW_API_URL || true)
api_url=$(printenv VITE_API_URL || true)
if is_safe_http_url "$share_preview_api_url"; then
  upstream="${share_preview_api_url%/}/public/share-preview"
elif is_safe_http_url "$api_url"; then
  upstream="${api_url%/}/api/public/share-preview"
else
  upstream=http://server:3001/public/share-preview
fi
printf 'set $share_preview_upstream "%s";\n' "$upstream" > /etc/nginx/share-preview.conf
