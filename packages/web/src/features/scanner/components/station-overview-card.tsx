import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { StationStatusDot } from "@/features/scanner/components/station-status-dot";
import {
  COLLECTION_TILE_CLASS,
  COLLECTION_TILE_LIVE_CLASS,
  COLLECTION_TILE_SELECTED_CLASS,
} from "@/lib/constants/collections";
import { STATION_STATUS_BADGE_VARIANTS } from "@/lib/constants/scanner";
import type { StationOverviewCardProps } from "@/lib/interfaces/stations";
import { cn } from "@/lib/utils";
import { IconCards } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StationOverviewCard({
  name,
  status,
  camera,
  latestCard,
  collectionName,
  totalCount,
  onOpen,
  openLabel,
  action,
  selected = false,
  onToggleSelect,
}: StationOverviewCardProps) {
  const { t } = useTranslation("scanner");
  const latestImage = latestCard?.image?.small || latestCard?.image?.normal;
  const statusLabel = {
    sorting: t("scannerPip.sorting"),
    paused: t("scannerPip.paused"),
    offline: t("stations.overview.offline"),
  }[status];

  const cameraArea = (
    <div className="relative aspect-[3/4] overflow-hidden bg-black">
      {camera}
    </div>
  );

  return (
    <article
      className={cn(
        COLLECTION_TILE_CLASS,
        selected
          ? COLLECTION_TILE_SELECTED_CLASS
          : status === "sorting" && COLLECTION_TILE_LIVE_CLASS,
      )}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {cameraArea}
        </button>
      ) : (
        cameraArea
      )}
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {onToggleSelect && (
            <span className="pointer-events-auto flex size-6 items-center justify-center rounded-md bg-background/80 shadow-sm backdrop-blur-sm">
              <Checkbox
                checked={selected}
                onCheckedChange={onToggleSelect}
                aria-label={t("stations.overview.select", { name })}
              />
            </span>
          )}
          <Badge
            variant={STATION_STATUS_BADGE_VARIANTS[status]}
            className="shadow-sm"
          >
            <StationStatusDot status={status} />
            {statusLabel}
          </Badge>
        </div>
        <Badge
          variant="outline"
          className="max-w-1/2 truncate bg-background/80 backdrop-blur-sm"
        >
          {collectionName ?? t("scannerPip.noCollection")}
        </Badge>
      </div>
      <div className="flex items-center gap-3 border-t p-3">
        <div className="relative aspect-[2.5/3.5] w-8 shrink-0 overflow-hidden rounded-sm bg-muted">
          {latestImage ? (
            <img
              src={latestImage}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <IconCards className="absolute inset-0 m-auto size-3.5 text-foreground/70" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="block max-w-full truncate rounded-sm text-left text-sm font-semibold hover:underline"
            >
              {name}
            </button>
          ) : (
            <p className="truncate text-sm font-semibold">{name}</p>
          )}
          <p className="truncate text-xs tabular-nums text-foreground/70">
            {latestCard?.name ?? t("stations.overview.noCards")} ·{" "}
            {t("cardCount", { count: totalCount })}
          </p>
        </div>
        {action && <ButtonGroup className="shrink-0">{action}</ButtonGroup>}
      </div>
    </article>
  );
}
