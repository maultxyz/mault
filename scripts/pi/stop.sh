#!/bin/bash
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "$0")" && pwd)/session.sh"
pi_require_user
pi_ensure_user_bus

systemctl --user stop mault-kiosk.service 2>/dev/null || true
systemctl --user stop mault-web.service mault-api.service mault-camera.service
if systemctl --user cat mault-controller.service >/dev/null 2>&1; then
  systemctl --user stop mault-controller.service
fi
echo "Mault stopped."
