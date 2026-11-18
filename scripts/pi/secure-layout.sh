#!/bin/bash
# Keeps everything root runs out of the service account's reach. The API runs
# as mault-service and faces the network, so nothing root executes or writes
# may live where that account can change it:
#   /opt/mault                  releases, root-owned, read-only to the service;
#                               root runs release code only after
#                               trusted-tree.py has checked it
#   /usr/local/sbin/mault       the mault command
#   /usr/local/lib/mault        root helpers that never run from a release:
#                               boot config, OS updates, the root updater and
#                               the release trust check
#   /var/lib/mault-system       root state (setup marker, update state and log),
#                               readable by the service's group
#   /var/lib/mault-system/requests
#                               drop box: the service can create files here but
#                               not list or read them; mault-update.path turns
#                               an update request into a root update
# Run as root by install.sh, `sudo mault update` and the root updater, always
# from a release that already passed the trust check. Helpers are copied and
# renamed into place, so a script running from the old copy keeps its inode.
set -euo pipefail
if [[ "$EUID" -eq 0 ]]; then export PATH=/usr/sbin:/usr/bin:/sbin:/bin; fi
unset BASH_ENV ENV

MAULT_HOME=/opt/mault
MAULT_DATA=/var/lib/mault
MAULT_SYSTEM_STATE=/var/lib/mault-system
MAULT_LIB=/usr/local/lib/mault
MAULT_USER=mault-service
SCRIPTS="$MAULT_HOME/current/scripts/pi"
ROOT_HELPERS=(boot-config.py os-updates.sh run-update.sh trusted-tree.py)
ROOT_UNITS=(mault-setup.service mault-boot-config.service mault-update.service mault-update.path)

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this as root." >&2
  exit 1
fi

python3 -I "$SCRIPTS/trusted-tree.py" --release "$MAULT_HOME/current"

install_root_file() {
  install -o root -g root -m "$3" "$1" "$2.new"
  mv -f "$2.new" "$2"
}

install -d -o root -g root -m 755 "$MAULT_LIB"
for helper in "${ROOT_HELPERS[@]}"; do
  install_root_file "$SCRIPTS/$helper" "$MAULT_LIB/$helper" 755
done
install_root_file "$SCRIPTS/mault.sh" /usr/local/sbin/mault 755
if [[ -L /usr/local/bin/mault ]]; then
  rm -f /usr/local/bin/mault
fi
python3 -I "$MAULT_LIB/trusted-tree.py" --path /usr/local/sbin/mault --path "$MAULT_LIB"

install -d -o root -g "$MAULT_USER" -m 2750 "$MAULT_SYSTEM_STATE"
install -d -o root -g "$MAULT_USER" -m 1730 "$MAULT_SYSTEM_STATE/requests"
if [[ -e "$MAULT_DATA/.setup-complete" && ! -e "$MAULT_SYSTEM_STATE/setup-complete" ]]; then
  touch "$MAULT_SYSTEM_STATE/setup-complete"
fi

for unit in "${ROOT_UNITS[@]}"; do
  install_root_file "$SCRIPTS/$unit" "/etc/systemd/system/$unit" 644
done
systemctl enable mault-boot-config.service mault-update.path
if [[ -d /run/systemd/system ]]; then
  systemctl daemon-reload
  systemctl start mault-update.path
fi
