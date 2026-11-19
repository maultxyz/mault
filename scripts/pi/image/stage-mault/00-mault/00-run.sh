#!/bin/bash -e

install -d "${ROOTFS_DIR}/var/tmp/mault-install/release"
install -m 644 files/mault-pi-arm64.tar.gz "${ROOTFS_DIR}/var/tmp/mault-install/bundle.tar.gz"
on_chroot << EOF2
set -e
tar -xzf /var/tmp/mault-install/bundle.tar.gz -C /var/tmp/mault-install/release --wildcards '*scripts/pi/install.sh'
bash /var/tmp/mault-install/release/scripts/pi/install.sh --image --bundle /var/tmp/mault-install/bundle.tar.gz
rm -rf /var/tmp/mault-install
EOF2
