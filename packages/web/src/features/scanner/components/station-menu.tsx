import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStationName } from "@/features/scanner/api/use-station-name";
import { useStations } from "@/features/scanner/api/use-stations";
import { ConnectSorterMenuOptions } from "@/features/scanner/components/connect-sorter-menu-options";
import { SORTERS_OVERVIEW_PATH } from "@/lib/constants/scanner";
import type {
  StationIdentityProps,
  StationMenuItemProps,
} from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import {
  IconCheck,
  IconCpu,
  IconLayoutGrid,
  IconPlugConnectedX,
  IconSelector,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function StationMenuItem({ station, index, isActive }: StationMenuItemProps) {
  const { setActiveStation } = useStations();
  const name = useStationName(station, index);
  return (
    <DropdownMenuItem onClick={() => setActiveStation(station.id)}>
      <span className="size-1.5 shrink-0 rounded-full bg-success" />
      <span className="flex-1 truncate">{name}</span>
      <IconCheck
        size={14}
        className={isActive ? "shrink-0 text-primary" : "invisible shrink-0"}
      />
    </DropdownMenuItem>
  );
}

function ActiveStationName({ station, index }: StationIdentityProps) {
  return <>{useStationName(station, index)}</>;
}

function DisconnectActiveStationItem({
  station,
  index,
}: StationIdentityProps) {
  const { t } = useTranslation("scanner");
  const { disconnectStation } = useStations();
  const name = useStationName(station, index);
  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={() => disconnectStation(station.id)}
    >
      <IconPlugConnectedX size={14} />
      {t("stations.disconnect", { name })}
    </DropdownMenuItem>
  );
}

export function StationMenu() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { stations, activeStationId, connectedStationIds } = useStations();
  const connectedStations = stations.filter((station) =>
    connectedStationIds.has(station.id),
  );
  const activeIndex = connectedStations.findIndex(
    (station) => station.id === activeStationId,
  );
  const activeStation =
    activeIndex >= 0 ? connectedStations[activeIndex] : undefined;
  const hasConnectedStations = connectedStations.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            data-tour="station-menu"
            className="max-w-56 min-w-0 shrink gap-1.5 px-1 hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
          >
            <span className="relative grid size-4.5 shrink-0 place-items-center rounded-sm bg-foreground text-background">
              <IconCpu className="size-3" />
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-sidebar",
                  hasConnectedStations ? "bg-success" : "bg-foreground/30",
                )}
              />
            </span>
            <span
              className={cn(
                "truncate font-semibold",
                hasConnectedStations ? "text-foreground" : "text-foreground/70",
              )}
            >
              {activeStation ? (
                <ActiveStationName
                  station={activeStation}
                  index={activeIndex}
                />
              ) : hasConnectedStations ? (
                t("stations.overview.open")
              ) : (
                t("stations.noneConnected")
              )}
            </span>
            <IconSelector className="size-3.5 text-foreground/70" />
          </Button>
        }
      />
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("stations.tabsLabel")}</DropdownMenuLabel>
          {!hasConnectedStations && (
            <p className="px-2 py-1.5 text-xs text-foreground/70">
              {t("stations.noneConnected")}
            </p>
          )}
          {connectedStations.map((station, index) => (
            <StationMenuItem
              key={station.id}
              station={station}
              index={index}
              isActive={station.id === activeStationId}
            />
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(SORTERS_OVERVIEW_PATH)}>
          <IconLayoutGrid size={14} />
          {t("stations.overview.open")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConnectSorterMenuOptions />
        {activeStation && (
          <>
            <DropdownMenuSeparator />
            <DisconnectActiveStationItem
              station={activeStation}
              index={activeIndex}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
