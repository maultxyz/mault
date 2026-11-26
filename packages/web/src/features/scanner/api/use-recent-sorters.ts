import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { readBleDeviceMap } from "@/features/scanner/lib/ble-device-map";
import { readRecentSorters } from "@/features/scanner/lib/recent-sorters";
import { sessionBluetoothDevices } from "@/features/scanner/lib/session-sorter-handles";
import type { ReconnectableRecentSorter } from "@/lib/interfaces/scanner";
import { recentSortersWithCurrentNames } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export function useRecentSorters(): ReconnectableRecentSorter[] {
  const { activeOrg } = useOrg();
  const { data: devices } = useQuery(devicesQueryOptions(activeOrg?.id));
  const [grantedDevices, setGrantedDevices] = useState<BluetoothDevice[]>([]);
  const [hasClosedGrantedSerialPort, setHasClosedGrantedSerialPort] =
    useState(false);
  const recentSorters = useMemo(
    () => (activeOrg?.id ? readRecentSorters(activeOrg.id) : []),
    [activeOrg?.id],
  );

  useEffect(() => {
    let cancelled = false;
    const bluetooth =
      typeof navigator === "undefined" ? undefined : navigator.bluetooth;
    if (bluetooth && typeof bluetooth.getDevices === "function") {
      void bluetooth
        .getDevices()
        .then((granted) => {
          if (!cancelled) setGrantedDevices(granted);
        })
        .catch(() => {});
    }
    const serial =
      typeof navigator === "undefined" ? undefined : navigator.serial;
    if (serial) {
      void serial
        .getPorts()
        .then((ports) => {
          if (!cancelled) {
            setHasClosedGrantedSerialPort(ports.some((port) => !port.readable));
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const knownBluetoothDevices = [...sessionBluetoothDevices(), ...grantedDevices];
  const bleDeviceMap = readBleDeviceMap();
  return recentSortersWithCurrentNames(recentSorters, devices).map(
    (sorter) => ({
      ...sorter,
      bluetoothDevice:
        knownBluetoothDevices.find(
          (device) =>
            device.id === sorter.id ||
            bleDeviceMap[device.id] === sorter.deviceGuid,
        ) ?? null,
      canReconnectOverUsb: hasClosedGrantedSerialPort,
    }),
  );
}
