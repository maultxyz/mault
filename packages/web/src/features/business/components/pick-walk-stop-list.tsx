import { Button } from "@/components/ui/button";
import { CardThumbnail } from "@/components/card-thumbnail";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  pickWalkOrderLabel,
  pickWalkPlaceTitle,
  pickWalkPrintingLabel,
  pickWalkSpotLabel,
} from "@/features/business/lib/pick-walk-labels";
import type { PickWalkStopListProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { pickWalkStops, type PickWalkEntry } from "@magic-vault/shared";
import {
  IconArrowsSort,
  IconBox,
  IconCircle,
  IconCircleCheckFilled,
  IconEyeOff,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function PickWalkStopList({
  entries,
  pickedScanIds,
  canPick,
  showOrderName,
  headingLevel = "h2",
  onToggle,
  onMissing,
  onSorterPick,
}: PickWalkStopListProps) {
  const { t } = useTranslation("business");
  const [cursor, setCursor] = useState(0);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const stops = useMemo(() => pickWalkStops(entries), [entries]);
  const Heading = headingLevel;

  useEffect(() => {
    const row = document.querySelector<HTMLElement>("[data-pick-row='active']");
    row?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const moveCursor = (next: number) => {
    const clamped = Math.max(0, Math.min(next, entries.length - 1));
    setCursor(clamped);
    const entry = entries[clamped];
    if (entry) rowRefs.current.get(entry.scanId)?.focus({ preventScroll: true });
  };

  useHotkeys({
    pickNext:
      entries.length > 0 ? () => moveCursor(cursor + 1) : undefined,
    pickPrevious:
      entries.length > 0 ? () => moveCursor(cursor - 1) : undefined,
    pickToggle:
      entries.length > 0 && canPick
        ? () => {
            const entry = entries[cursor];
            if (entry) onToggle(entry.scanId, !pickedScanIds.has(entry.scanId));
          }
        : undefined,
  });

  const pickRow = (entry: PickWalkEntry, index: number) => {
    const picked = pickedScanIds.has(entry.scanId);
    const spot = pickWalkSpotLabel(entry, t);
    const orderLabel = pickWalkOrderLabel(entry, showOrderName, t);
    return (
      <div key={entry.scanId} className="flex items-stretch">
        <Button
          variant="ghost"
          ref={(node) => {
            if (node) {
              rowRefs.current.set(entry.scanId, node);
              return () => {
                rowRefs.current.delete(entry.scanId);
              };
            }
            rowRefs.current.delete(entry.scanId);
          }}
          tabIndex={index === cursor ? 0 : -1}
          onFocus={() => {
            if (index !== cursor) setCursor(index);
          }}
          data-pick-row={index === cursor ? "active" : undefined}
          aria-pressed={picked}
          disabled={!canPick}
          aria-label={
            entry.orderRef == null
              ? t("orders.pickCopy", { name: entry.card.name })
              : t("orders.pickCopyForOrder", {
                  name: entry.card.name,
                  order: entry.orderRef,
                })
          }
          className={cn(
            "h-auto min-w-0 flex-1 items-center justify-start gap-2.5 rounded-none p-2 text-start max-md:min-h-14 max-md:gap-3 max-md:p-3",
            index === cursor && "bg-muted/60 ring-1 ring-inset ring-ring",
            picked && "text-foreground/60",
          )}
          onClick={() => onToggle(entry.scanId, !picked)}
        >
          {picked ? (
            <IconCircleCheckFilled className="size-4 shrink-0 text-success-foreground" />
          ) : (
            <IconCircle className="size-4 shrink-0 text-foreground/30" />
          )}
          <CardThumbnail
            image={entry.card.image}
            className="w-10 shrink-0 max-md:w-12"
          />
          <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <span
              className={cn(
                "w-full truncate text-sm font-medium",
                picked && "line-through decoration-1",
              )}
            >
              {entry.card.name}
            </span>
            <span className="w-full truncate text-xs font-semibold text-primary">
              {spot}
            </span>
            <span className="w-full truncate text-xs text-foreground/70">
              {pickWalkPrintingLabel(entry, t)}
              {orderLabel ? ` · ${orderLabel}` : ""}
            </span>
          </span>
        </Button>
        {onMissing && canPick && !picked && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-1 shrink-0 self-center"
            aria-label={t("orders.pickWalk.cantFindCard", {
              name: entry.card.name,
            })}
            title={t("orders.pickWalk.cantFindCard", {
              name: entry.card.name,
            })}
            onClick={() => onMissing(entry.scanId)}
          >
            <IconEyeOff />
          </Button>
        )}
      </div>
    );
  };

  let indexOffset = 0;
  return (
    <div className="flex flex-col gap-4">
      {stops.map((stop) => {
        const pickedInStop = stop.entries.filter((entry) =>
          pickedScanIds.has(entry.scanId),
        ).length;
        const isDone = pickedInStop === stop.entries.length;
        const startIndex = indexOffset;
        indexOffset += stop.entries.length;
        return (
          <section
            key={stop.stopKey}
            className="flex flex-col gap-1.5"
            aria-label={pickWalkPlaceTitle(stop, t)}
          >
            <Heading className="flex items-center gap-2 font-heading text-sm font-semibold">
              {isDone ? (
                <IconCircleCheckFilled className="size-4 shrink-0 text-success-foreground" />
              ) : (
                <IconBox className="size-4 shrink-0 text-foreground/70" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {pickWalkPlaceTitle(stop, t)}
              </span>
              <span className="shrink-0 text-xs font-normal tabular-nums text-foreground/70">
                {t("orders.pickWalk.stopProgress", {
                  picked: pickedInStop,
                  total: stop.entries.length,
                })}
              </span>
              {onSorterPick && canPick && stop.locationGuid != null && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 max-md:h-7 max-md:px-2 max-md:text-xs"
                  title={t("orders.sorterPick.stopButtonHint", {
                    location: stop.locationName,
                  })}
                  onClick={() => onSorterPick(stop)}
                >
                  <IconArrowsSort />
                  {t("orders.sorterPick.stopButton")}
                </Button>
              )}
            </Heading>
            <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-border">
              {stop.entries.map((entry, entryIndex) =>
                pickRow(entry, startIndex + entryIndex),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
