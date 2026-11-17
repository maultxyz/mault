#!/bin/sh
# Writes the web app's runtime config (window.__ENV__) from the container's
# environment, so the published image carries no deployment-specific values.
# Runs from nginx's /docker-entrypoint.d before nginx starts.
set -eu

out=/usr/share/nginx/html/env.js
json=""
for name in VITE_API_URL VITE_AUTH_PROVIDER VITE_NEON_AUTH_URL VITE_NEON_DATA_API_URL VITE_APP_ENV VITE_POSTHOG_PROJECT_API_KEY VITE_POSTHOG_HOST VITE_SHOW_SCAN_LOGS VITE_API_DOCS_URL; do
  value=$(printenv "$name" || true)
  value=$(printf '%s' "$value" | tr -d '\r\n')
  if [ -n "$value" ]; then
    escaped=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')
    json="$json${json:+,}\"$name\":\"$escaped\""
  fi
done
printf 'window.__ENV__ = {%s};\n' "$json" > "$out"

# Upstream for share link previews (nginx.conf's /__share_preview). Same
# origin deployments reach the API container directly; an absolute
# VITE_API_URL is called the way the browser calls it. A value nginx can't
# quote safely falls back to the API container.
api_url=$(printenv VITE_API_URL || true)
upstream=http://server:3001/public/share-preview
case "$api_url" in
  http://*|https://*)
    if ! printf '%s' "$api_url" | grep -q '[[:space:]";{}$\\]'; then
      upstream="${api_url%/}/api/public/share-preview"
    fi
    ;;
esac
printf 'set $share_preview_upstream "%s";\n' "$upstream" > /etc/nginx/share-preview.conf

# Neon Auth base URL for nginx.conf's /auth/mobile-start (Expo social
# sign-in); empty turns that route off.
neon_auth_url=$(printenv VITE_NEON_AUTH_URL || true)
case "$neon_auth_url" in
  https://*)
    if printf '%s' "$neon_auth_url" | grep -q '[[:space:]";{}$\\]'; then
      neon_auth_url=""
    fi
    ;;
  *) neon_auth_url="" ;;
esac
printf 'set $neon_auth_url "%s";\n' "${neon_auth_url%/}" > /etc/nginx/mobile-social-sign-in.conf
