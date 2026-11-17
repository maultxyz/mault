#!/bin/bash -e

install -d "${ROOTFS_DIR}/tmp/mault-install/release"
install -m 644 files/mault-pi-arm64.tar.gz "${ROOTFS_DIR}/tmp/mault-install/bundle.tar.gz"
on_chroot << EOF2
set -e
tar -xzf /tmp/mault-install/bundle.tar.gz -C /tmp/mault-install/release --wildcards '*scripts/pi/install.sh'
bash /tmp/mault-install/release/scripts/pi/install.sh --image --bundle /tmp/mault-install/bundle.tar.gz
rm -rf /tmp/mault-install
EOF2
