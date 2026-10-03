import { EmptyState } from "@/components/empty-state";
import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStations } from "@/features/scanner/api/use-stations";
import { OfflineDeviceTile } from "@/features/scanner/components/offline-device-tile";
import { IconDevices } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

export function StationOverviewGrid() {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: devices = [] } = useQuery(devicesQueryOptions(activeOrg?.id));
  const {
    stations,
    connectedStationIds,
    attachOverview,
    getOverviewTileElement,
  } = useStations();
  const connected = stations.filter((s) => connectedStationIds.has(s.id));
  const connectedDeviceGuids = new Set(connected.map((s) => s.deviceGuid));
  const offlineDevices = devices.filter(
    (d) => !connectedDeviceGuids.has(d.guid),
  );

  useLayoutEffect(() => attachOverview(), [attachOverview]);

  if (connected.length === 0 && offlineDevices.length === 0) {
    return (
      <EmptyState
        icon={IconDevices}
        title={t("stations.overview.emptyTitle")}
        description={t("stations.overview.emptyDescription")}
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {connected.map((station) => (
        <div
          key={station.id}
          className="flex flex-col"
          ref={(node) => {
            const el = getOverviewTileElement(station.id);
            if (node && el.parentNode !== node) node.appendChild(el);
          }}
        />
      ))}
      {offlineDevices.map((device) => (
        <OfflineDeviceTile key={device.guid} device={device} />
      ))}
    </div>
  );
}
