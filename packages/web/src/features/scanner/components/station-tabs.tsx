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
import { IconPlus, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// One tab per connected sorter: a tab appears when a board connects and
// disappears when it disconnects, including via the tab's own disconnect.
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
    disconnectStation,
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
          const name =
            devices.find((d) => d.guid === station.deviceGuid)?.name ??
            t("stations.label", { number: index + 1 });
          const variant = isActive ? "default" : "ghost";
          return (
            <div key={station.id} className="flex items-center">
              <Button
                role="tab"
                aria-selected={isActive}
                size="sm"
                variant={variant}
                className="rounded-r-none"
                onClick={() => setActiveStation(station.id)}
              >
                {name}
              </Button>
              <Button
                size="icon-sm"
                variant={variant}
                className="rounded-l-none"
                aria-label={t("stations.disconnect", { name })}
                title={t("stations.disconnect", { name })}
                onClick={() => disconnectStation(station.id)}
              >
                <IconX />
              </Button>
            </div>
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
