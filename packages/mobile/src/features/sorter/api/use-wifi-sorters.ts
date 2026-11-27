import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { linkedSorterGuidsMissingFromDevices } from "@magic-vault/shared";
import { devicesQueryOptions, sorterLinksQueryOptions } from "@/features/devices/api/devices";
import { useActiveOrgId } from "@/hooks/use-org";
import type { WifiSorter } from "@/lib/interfaces/sorter";

export function useWifiSorters(poll: boolean): WifiSorter[] {
  const orgId = useActiveOrgId();
  const devices = useQuery(devicesQueryOptions(orgId));
  const links = useQuery(sorterLinksQueryOptions(orgId, poll));

  const linkedGuidsMissingFromDevices = linkedSorterGuidsMissingFromDevices(links.data, devices.data);
  const devicesLoaded = devices.isSuccess;
  const refetchDevices = devices.refetch;

  useEffect(() => {
    if (devicesLoaded && linkedGuidsMissingFromDevices) void refetchDevices();
  }, [devicesLoaded, linkedGuidsMissingFromDevices, refetchDevices]);

  return (links.data ?? [])
    .filter((link) => link.linked)
    .flatMap((link) => {
      const device = devices.data?.find((d) => d.guid === link.guid);
      return device ? [{ guid: link.guid, name: device.name, online: link.online, inUse: link.inUse }] : [];
    });
}
