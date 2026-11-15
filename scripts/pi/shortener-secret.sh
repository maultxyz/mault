#!/usr/bin/env bash
# Sourced by run-api.sh and run-shortener.sh. Both services must share one
# SHORTENER_API_SECRET, and existing installs predate it in .env, so the
# secret lives in the Mault state directory and is created on first use.

pi_export_shortener_secret() {
  local state_dir="$1"
  local secret_file="$state_dir/shortener-secret"
  if [[ ! -s "$secret_file" ]]; then
    local temporary
    temporary="$(mktemp "$state_dir/.shortener-secret.XXXXXX")"
    od -An -tx1 -N32 /dev/urandom | tr -d ' \n' > "$temporary"
    mv -n "$temporary" "$secret_file"
    rm -f "$temporary"
  fi
  SHORTENER_API_SECRET="$(cat "$secret_file")"
  export SHORTENER_API_SECRET
}
