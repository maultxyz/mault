import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStations } from "@/features/scanner/api/use-stations";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// One tab per connected sorter. Tabs can't be opened or closed by hand: they
// appear when a board connects and disappear when it disconnects.
export function StationTabs() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const { data: devices = [] } = useQuery(devicesQueryOptions(activeOrg?.id));
  const {
    stations,
    activeStationId,
    connectedStationIds,
    setActiveStation,
    connectAnotherSorter,
    canConnectAnotherSorter,
    sorterLimitIsHardCap,
  } = useStations();
  const connected = stations.filter((s) => connectedStationIds.has(s.id));
  if (connected.length === 0) return null;

  const bluetoothSupported =
    typeof navigator !== "undefined" && !!navigator.bluetooth;

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 shrink-0 overflow-x-auto border-b">
      <div
        role="tablist"
        aria-label={t("stations.tabsLabel")}
        className="flex items-center gap-1"
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
      {canConnectAnotherSorter && !bluetoothSupported ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => connectAnotherSorter("usb")}
        >
          <IconPlus />
          {t("stations.connect")}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="sm" variant="ghost" />}
          >
            <IconPlus />
            {t("stations.connect")}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {canConnectAnotherSorter ? (
              <>
                <DropdownMenuItem onClick={() => connectAnotherSorter("usb")}>
                  {t("scannerMenu.connectUsb")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => connectAnotherSorter("bluetooth")}
                >
                  {t("scannerMenu.connectBluetooth")}
                </DropdownMenuItem>
              </>
            ) : sorterLimitIsHardCap ? (
              <DropdownMenuItem disabled>
                {t("stations.hardCapReached.title", {
                  max: MAX_CONNECTED_SORTERS,
                })}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                {t("scannerMenu.connectAnotherUpgrade")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
