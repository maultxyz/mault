#!/bin/bash
# Turns on automatic OS security updates through unattended-upgrades: Debian
# security fixes plus the Raspberry Pi archive (kernel, firmware, Pi
# libraries). Never reboots on its own, so a scan is never cut off; kernel
# fixes apply at the next power cycle. Run as root by install.sh, every
# `sudo mault update` and `sudo mault os-updates`.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
if ! dpkg-query -W -f='${Status}' unattended-upgrades 2>/dev/null | grep -q "install ok installed"; then
  echo "[os-updates] Installing unattended-upgrades"
  apt-get update
  apt-get install -y unattended-upgrades
fi

cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

cat > /etc/apt/apt.conf.d/52mault-unattended-upgrades <<'EOF'
Unattended-Upgrade::Origins-Pattern {
  "origin=Raspberry Pi Foundation,codename=${distro_codename},label=Raspberry Pi Foundation";
};
Unattended-Upgrade::Automatic-Reboot "false";
EOF

if command -v systemctl >/dev/null 2>&1; then
  systemctl enable apt-daily.timer apt-daily-upgrade.timer >/dev/null 2>&1 || true
fi
echo "[os-updates] Automatic OS security updates are on."
