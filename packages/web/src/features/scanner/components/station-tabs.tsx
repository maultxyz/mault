import { Button } from "@/components/ui/button";
import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStations } from "@/features/scanner/api/use-stations";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

// One tab per connected sorter. Tabs can't be opened or closed by hand: they
// appear when a board connects and disappear when it disconnects.
export function StationTabs() {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: devices = [] } = useQuery(devicesQueryOptions(activeOrg?.id));
  const { stations, activeStationId, connectedStationIds, setActiveStation } =
    useStations();
  const connected = stations.filter((s) => connectedStationIds.has(s.id));
  if (connected.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label={t("stations.tabsLabel")}
      className="flex items-center gap-1 px-2 py-1.5 shrink-0 overflow-x-auto border-b"
    >
      {connected.map((station, index) => {
        const isActive = station.id === activeStationId;
        return (
          <Button
            key={station.id}
            role="tab"
            aria-selected={isActive}
            size="sm"
            variant={isActive ? "default" : "ghost"}
            onClick={() => setActiveStation(station.id)}
          >
            {devices.find((d) => d.guid === station.deviceGuid)?.name ??
              t("stations.label", { number: index + 1 })}
          </Button>
        );
      })}
    </div>
  );
}
