import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { sorterLinksQueryOptions } from "@/features/scanner/api/sorter-link";
import { useStations } from "@/features/scanner/api/use-stations";
import { SORTER_LINKS_REFETCH_MS } from "@/lib/constants/timing";
import type { WifiSorterOption } from "@/lib/interfaces/sorter-wifi";
import { useQuery } from "@tanstack/react-query";

export function useWifiSorters(poll: boolean): WifiSorterOption[] {
  const { activeOrg } = useOrg();
  const { isDeviceConnected } = useStations();
  const devices = useQuery(devicesQueryOptions(activeOrg?.id));
  const links = useQuery({
    ...sorterLinksQueryOptions(activeOrg?.id),
    refetchInterval: poll ? SORTER_LINKS_REFETCH_MS : false,
  });

  return (links.data ?? [])
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
}
