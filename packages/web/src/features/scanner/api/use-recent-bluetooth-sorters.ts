import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { readRecentSorters } from "@/features/scanner/lib/recent-sorters";
import type { RecentBluetoothSorter } from "@/lib/interfaces/scanner";
import { recentSortersWithCurrentNames } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export function useRecentBluetoothSorters(): RecentBluetoothSorter[] {
  const { activeOrg } = useOrg();
  const { data: devices } = useQuery(devicesQueryOptions(activeOrg?.id));
  const [grantedDevices, setGrantedDevices] = useState<BluetoothDevice[]>([]);
  const recentSorters = useMemo(
    () => (activeOrg?.id ? readRecentSorters(activeOrg.id) : []),
    [activeOrg?.id],
  );

  useEffect(() => {
    const bluetooth = typeof navigator === "undefined" ? undefined : navigator.bluetooth;
    if (!bluetooth || typeof bluetooth.getDevices !== "function") return;
    let cancelled = false;
    void bluetooth
      .getDevices()
      .then((granted) => {
        if (!cancelled) setGrantedDevices(granted);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () =>
      recentSortersWithCurrentNames(recentSorters, devices).map((sorter) => ({
        ...sorter,
        bluetoothDevice:
          grantedDevices.find((device) => device.id === sorter.id) ?? null,
      })),
    [recentSorters, devices, grantedDevices],
  );
}
