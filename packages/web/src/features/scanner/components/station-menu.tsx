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
import { useNextSorterNeedingAttention } from "@/features/scanner/api/use-next-sorter-needing-attention";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { useStationAttentionLabel } from "@/features/scanner/api/use-station-attention-label";
import { useStationName } from "@/features/scanner/api/use-station-name";
import { useStations } from "@/features/scanner/api/use-stations";
import { ConnectSorterMenuOptions } from "@/features/scanner/components/connect-sorter-menu-options";
import { StationStatusDot } from "@/features/scanner/components/station-status-dot";
import { SORTERS_OVERVIEW_PATH } from "@/lib/constants/scanner";
import type {
  StationIdentityProps,
  StationMenuItemProps,
  StationStatus,
} from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconCheck,
  IconCpu,
  IconLayoutGrid,
  IconPlugConnectedX,
  IconSelector,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function StationMenuItem({ station, index, isActive }: StationMenuItemProps) {
  const { t } = useTranslation("scanner");
  const { setActiveStation, stationAttention } = useStations();
  const { runningKeys } = useSorterSelection();
  const name = useStationName(station, index);
  const attentionLabel = useStationAttentionLabel();
  const attention = stationAttention.get(station.id);
  const status: StationStatus = attention
    ? "attention"
    : runningKeys.has(station.deviceGuid ?? station.id)
      ? "sorting"
      : "paused";
  return (
    <DropdownMenuItem onClick={() => setActiveStation(station.id)}>
      <StationStatusDot status={status} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{name}</span>
        {!attention && (
          <span className="sr-only">
            {status === "sorting"
              ? t("scannerPip.sorting")
              : t("scannerPip.paused")}
          </span>
        )}
        {attention && (
          <span className="truncate text-2xs text-destructive">
            {attentionLabel(attention)}
          </span>
        )}
      </span>
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
  const {
    stations,
    activeStationId,
    connectedStationIds,
    stationIdsNeedingAttention,
  } = useStations();
  const { goToNextSorterNeedingAttention } = useNextSorterNeedingAttention();
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
              {hasConnectedStations && (
                <span
                  className={cn(
                    "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-sidebar",
                    stationIdsNeedingAttention.length > 0
                      ? "bg-destructive"
                      : "bg-success",
                  )}
                />
              )}
            </span>
            {stationIdsNeedingAttention.length > 0 && (
              <span className="sr-only">
                {t("stations.attention.count", {
                  count: stationIdsNeedingAttention.length,
                })}
              </span>
            )}
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
        {goToNextSorterNeedingAttention && (
          <DropdownMenuItem onClick={goToNextSorterNeedingAttention}>
            <IconAlertTriangle size={14} />
            {t("stations.attention.goToNext")}
          </DropdownMenuItem>
        )}
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
