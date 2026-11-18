#!/bin/bash
# Keeps everything root runs out of the service account's reach. The API runs
# as mault-service and faces the network, so nothing root executes or writes
# may live where that account can change it:
#   /opt/mault                  releases, root-owned, read-only to the service
#   /var/lib/mault-system       root state (setup marker, update state and log),
#                               readable by the service's group
#   /var/lib/mault-system/requests
#                               drop box: the service can create files here but
#                               not list or read them; mault-update.path turns
#                               an update request into a root update
# Run as root by install.sh, `sudo mault update` and the root updater. Older
# installs kept releases service-owned; the first `sudo mault update` with
# this script moves them over.
set -euo pipefail

MAULT_HOME=/opt/mault
MAULT_DATA=/var/lib/mault
MAULT_SYSTEM_STATE=/var/lib/mault-system
MAULT_USER=mault-service
SCRIPTS="$MAULT_HOME/current/scripts/pi"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this as root." >&2
  exit 1
fi

chown -R root:root "$MAULT_HOME"
chmod -R go-w,a+rX "$MAULT_HOME"

install -d -o root -g "$MAULT_USER" -m 2750 "$MAULT_SYSTEM_STATE"
install -d -o root -g "$MAULT_USER" -m 1730 "$MAULT_SYSTEM_STATE/requests"
if [[ -e "$MAULT_DATA/.setup-complete" && ! -e "$MAULT_SYSTEM_STATE/setup-complete" ]]; then
  touch "$MAULT_SYSTEM_STATE/setup-complete"
fi

for unit in mault-setup.service mault-boot-config.service mault-update.service mault-update.path; do
  install -m 644 "$SCRIPTS/$unit" "/etc/systemd/system/$unit"
done
systemctl enable mault-boot-config.service mault-update.path
if [[ -d /run/systemd/system ]]; then
  systemctl daemon-reload
  systemctl start mault-update.path
fi
