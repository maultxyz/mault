import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { sorterLinksQueryOptions } from "@/features/scanner/api/sorter-link";
import { useStations } from "@/features/scanner/api/use-stations";
import type { WifiSorters } from "@/lib/interfaces/sorter-wifi";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  linkedSorterGuidsMissingFromDevices,
  SORTER_LINKS_REFETCH_MS,
} from "@magic-vault/shared";

export function useWifiSorters(poll: boolean): WifiSorters {
  const { activeOrg } = useOrg();
  const { isDeviceConnected } = useStations();
  const devices = useQuery(devicesQueryOptions(activeOrg?.id));
  const links = useQuery({
    ...sorterLinksQueryOptions(activeOrg?.id),
    refetchInterval: poll ? SORTER_LINKS_REFETCH_MS : false,
  });

  const linkedGuidsMissingFromDevices = linkedSorterGuidsMissingFromDevices(
    links.data,
    devices.data,
  );
  const devicesLoaded = devices.isSuccess;
  const refetchDevices = devices.refetch;

  useEffect(() => {
    if (devicesLoaded && linkedGuidsMissingFromDevices) void refetchDevices();
  }, [devicesLoaded, linkedGuidsMissingFromDevices, refetchDevices]);

  const sorters = (links.data ?? [])
    .filter((link) => link.linked)
    .flatMap((link) => {
      const device = devices.data?.find((d) => d.guid === link.guid);
      if (!device) return [];
      return [
        {
          guid: link.guid,
          name: device.name,
          online: link.online,
          inUse: link.inUse,
          connectedHere: isDeviceConnected(link.guid),
        },
      ];
    });
  return { sorters, isLoading: links.isPending || devices.isPending };
}
