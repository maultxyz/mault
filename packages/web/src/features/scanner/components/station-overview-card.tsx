import { StationStatusDot } from "@/features/scanner/components/station-status-dot";
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
}: StationOverviewCardProps) {
  const { t } = useTranslation("scanner");
  const latestImage = latestCard?.image?.small || latestCard?.image?.normal;
  const statusLabel = {
    sorting: t("scannerPip.sorting"),
    paused: t("scannerPip.paused"),
    offline: t("stations.overview.offline"),
  }[status];

  const body = (
    <>
      <div className="p-2 pb-0">
        <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-black">
          {camera}
        </div>
      </div>
      <div className="flex items-center gap-2 p-2">
        <div className="relative aspect-[2.5/3.5] w-10 shrink-0 overflow-hidden rounded-md bg-muted">
          {latestImage ? (
            <img
              src={latestImage}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <IconCards className="absolute inset-0 m-auto size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm text-foreground">
            {latestCard?.name ?? t("stations.overview.noCards")}
          </span>
          <span className="flex justify-between gap-2 text-xs text-foreground/70">
            <span className="truncate">
              {collectionName ?? t("scannerPip.noCollection")}
            </span>
            <span className="shrink-0 tabular-nums">
              {t("cardCount", { count: totalCount })}
            </span>
          </span>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-background",
        onOpen && "transition-colors hover:border-primary",
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <StationStatusDot status={status} />
        <span className="truncate text-sm font-medium text-foreground">
          {name}
        </span>
        <span className="ml-auto shrink-0 text-xs text-foreground/70">
          {statusLabel}
        </span>
        {action && (
          <div className="-my-1 -mr-1.5 flex shrink-0 items-center">
            {action}
          </div>
        )}
      </div>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="flex flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  );
}
