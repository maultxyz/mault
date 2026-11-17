#!/bin/bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")" && pwd)/session.sh"
pi_require_user
pi_ensure_user_bus

systemctl --user stop mault-kiosk.service 2>/dev/null || true
systemctl --user stop mault-web.service mault-api.service mault-camera.service
echo "Mault stopped."
