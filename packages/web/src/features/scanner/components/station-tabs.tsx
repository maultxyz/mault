import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStationName } from "@/features/scanner/api/use-station-name";
import { useStations } from "@/features/scanner/api/use-stations";
import type { StationTabProps } from "@/lib/interfaces/stations";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { IconLayoutGrid, IconPlus, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useMatch, useNavigate } from "react-router-dom";
import { SORTERS_OVERVIEW_PATH } from "@/lib/constants/scanner";
import { SETTINGS_PATHS } from "@/lib/constants/settings";

function StationTab({ station, index, isActive }: StationTabProps) {
  const { t } = useTranslation("scanner");
  const { setActiveStation, disconnectStation } = useStations();
  const name = useStationName(station, index);
  const variant = isActive ? "default" : "ghost";
  return (
    <div className="flex items-center">
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
}

// One tab per connected sorter: a tab appears when a board connects and
// disappears when it disconnects, including via the tab's own disconnect.
export function StationTabs() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const isOverview = !!useMatch(SORTERS_OVERVIEW_PATH);
  const {
    stations,
    activeStationId,
    connectedStationIds,
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
      <Button
        size="icon-sm"
        variant={isOverview ? "default" : "ghost"}
        nativeButton={false}
        aria-label={t("stations.overview.open")}
        title={t("stations.overview.open")}
        render={<Link to={SORTERS_OVERVIEW_PATH} />}
      >
        <IconLayoutGrid />
      </Button>
      <div
        role="tablist"
        aria-label={t("stations.tabsLabel")}
        className="flex items-center gap-1"
      >
        {connected.map((station, index) => (
          <StationTab
            key={station.id}
            station={station}
            index={index}
            isActive={station.id === activeStationId}
          />
        ))}
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
              <DropdownMenuItem onClick={() => navigate(SETTINGS_PATHS.billing)}>
                {t("scannerMenu.connectAnotherUpgrade")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
