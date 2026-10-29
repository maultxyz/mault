import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { useStations } from "@/features/scanner/api/use-stations";
import { findStationDeviceName } from "@/features/scanner/lib/station-name";
import type { SorterOverview } from "@/lib/interfaces/stations";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useSorterOverview(searchQuery: string): SorterOverview {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: devices = [], isLoading } = useQuery(
    devicesQueryOptions(activeOrg?.id),
  );
  const { stations, connectedStationIds } = useStations();
  const { runningKeys } = useSorterSelection();

  const connectedSorters = stations
    .filter((station) => connectedStationIds.has(station.id))
    .map((station, index) => ({
      station,
      index,
      name:
        findStationDeviceName(station, devices) ??
        t("stations.label", { number: index + 1 }),
      selectionKey: station.deviceGuid ?? station.id,
    }));
  const connectedDeviceGuids = new Set(
    connectedSorters.map((sorter) => sorter.station.deviceGuid),
  );
  const offlineDevices = devices.filter(
    (device) => !connectedDeviceGuids.has(device.guid),
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = (name: string) =>
    !normalizedQuery || name.toLowerCase().includes(normalizedQuery);

  return {
    isLoading,
    connectedSorters,
    offlineDevices,
    matchingConnectedSorters: connectedSorters.filter((sorter) =>
      matchesSearch(sorter.name),
    ),
    matchingOfflineDevices: offlineDevices.filter((device) =>
      matchesSearch(device.name),
    ),
    sortingCount: connectedSorters.filter((sorter) =>
      runningKeys.has(sorter.selectionKey),
    ).length,
    totalCount: connectedSorters.length + offlineDevices.length,
  };
}
