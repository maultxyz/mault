import { Button } from "@/components/ui/button";
import { useStationAttentionLabel } from "@/features/scanner/api/use-station-attention-label";
import { useStationName } from "@/features/scanner/api/use-station-name";
import { useStations } from "@/features/scanner/api/use-stations";
import { StationStatusDot } from "@/features/scanner/components/station-status-dot";
import { useStationSummaries } from "@/features/scanner/lib/station-summary-store";
import type {
  StationIdentityProps,
  StationStatus,
} from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function ScannerPipSorterRow({ station, index }: StationIdentityProps) {
  const { t } = useTranslation("scanner");
  const { activeStationId, stationAttention, setActiveStation } = useStations();
  const summary = useStationSummaries().get(station.id);
  const name = useStationName(station, index);
  const attentionLabel = useStationAttentionLabel();
  const attention = stationAttention.get(station.id);
  const isSelected = station.id === activeStationId;
  const status: StationStatus = attention
    ? "attention"
    : summary?.isRunning
      ? "sorting"
      : "paused";
  const showLabel = t("scannerPip.showSorter", { name });

  return (
    <li>
      <Button
        variant={isSelected ? "selected" : "ghost"}
        className="w-full justify-start"
        aria-pressed={isSelected}
        title={attention ? attentionLabel(attention) : showLabel}
        onClick={() => setActiveStation(station.id)}
      >
        <StationStatusDot status={status} />
        {!attention && (
          <span className="sr-only">
            {summary?.isRunning
              ? t("scannerPip.sorting")
              : t("scannerPip.paused")}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-left">{name}</span>
        <span
          className={cn(
            "max-w-1/2 shrink-0 truncate tabular-nums",
            attention ? "text-destructive" : "text-foreground/70",
          )}
        >
          {attention
            ? attentionLabel(attention)
            : (summary?.totalCount ?? 0).toLocaleString()}
        </span>
      </Button>
    </li>
  );
}

export function ScannerPipSorterList() {
  const { t } = useTranslation("scanner");
  const { stations, connectedStationIds } = useStations();
  const connectedStations = stations.filter((station) =>
    connectedStationIds.has(station.id),
  );

  if (connectedStations.length < 2) return null;

  return (
    <ul
      aria-label={t("stations.tabsLabel")}
      className="flex shrink-0 flex-col gap-0.5 border-t p-1"
    >
      {connectedStations.map((station, index) => (
        <ScannerPipSorterRow key={station.id} station={station} index={index} />
      ))}
    </ul>
  );
}
