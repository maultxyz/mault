import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { CardThumbnail } from "@/components/card-thumbnail";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  pickWalkOrderLabel,
  pickWalkPlaceTitle,
  pickWalkPrintingLabel,
  pickWalkSpotLabel,
} from "@/features/business/lib/pick-walk-labels";
import type { PickFocusViewProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronLeft,
  IconEyeOff,
  IconPackageExport,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const FOCUS_SWIPE_THRESHOLD_PX = 80;

export function PickFocusView({
  entries,
  pickedScanIds,
  total,
  pickedCount,
  complete,
  showOrderName,
  canPick,
  isReleasing,
  onPick,
  onUnpick,
  onMissing,
  onComplete,
  completedCount,
  completeLabel,
  onBack,
}: PickFocusViewProps) {
  const { t } = useTranslation("business");
  const firstUnpickedIndex = entries.findIndex(
    (entry) => !pickedScanIds.has(entry.scanId),
  );
  const [cursor, setCursor] = useState(() =>
    firstUnpickedIndex === -1 ? 0 : firstUnpickedIndex,
  );
  const [swipeDelta, setSwipeDelta] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    setCursor((current) => {
      const entry = entries[current];
      if (entry && !pickedScanIds.has(entry.scanId)) return current;
      const next = entries.findIndex(
        (candidate) => !pickedScanIds.has(candidate.scanId),
      );
      return next === -1 ? Math.min(current, entries.length - 1) : next;
    });
  }, [entries, pickedScanIds]);

  const entry = entries[cursor];
  const picked = entry ? pickedScanIds.has(entry.scanId) : false;

  const skipForward = () => {
    for (let index = cursor + 1; index < entries.length; index++) {
      if (!pickedScanIds.has(entries[index].scanId)) {
        setCursor(index);
        return;
      }
    }
    setCursor(Math.min(cursor + 1, entries.length - 1));
  };

  const stepBack = () => {
    setCursor(Math.max(cursor - 1, 0));
  };

  const pickCurrent = () => {
    if (!entry || !canPick) return;
    if (picked) onUnpick(entry.scanId);
    else onPick(entry.scanId);
  };

  const releaseCurrent = () => {
    if (entry && canPick && !picked) onMissing(entry);
  };

  useHotkeys(
    {
      pickNext: entries.length > 0 ? skipForward : undefined,
      pickPrevious: entries.length > 0 ? stepBack : undefined,
      pickToggle: entries.length > 0 && canPick ? pickCurrent : undefined,
    },
    true,
    1,
  );

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartRef.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchMove = (event: React.TouchEvent) => {
    if (touchStartRef.current == null) return;
    const delta = (event.touches[0]?.clientX ?? 0) - touchStartRef.current;
    setSwipeDelta(delta);
  };
  const onTouchEnd = () => {
    const delta = swipeDelta;
    touchStartRef.current = null;
    setSwipeDelta(0);
    if (Math.abs(delta) < FOCUS_SWIPE_THRESHOLD_PX) return;
    if (delta > 0) pickCurrent();
    else skipForward();
  };

  const swiping = swipeDelta !== 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-1.5 border-b px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("orders.batch.focusBack")}
          title={t("orders.batch.focusBack")}
          onClick={onBack}
        >
          <IconChevronLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-medium tabular-nums"
            role="status"
            aria-live="polite"
          >
            {t("orders.pickWalk.progress", { picked: pickedCount, total })}
          </p>
          <div
            className="mt-1 h-1 overflow-hidden rounded-sm bg-muted"
            aria-hidden
          >
            <div
              className="h-full rounded-sm bg-primary transition-[width] motion-reduce:transition-none"
              style={{ width: `${total === 0 ? 0 : (pickedCount / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {complete ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold">{t("orders.pickWalk.allPicked")}</p>
          {canPick && completedCount > 0 && (
            <Button size="lg" onClick={onComplete}>
              <IconPackageExport />
              {completeLabel ?? t("orders.batch.complete", { count: completedCount })}
            </Button>
          )}
        </div>
      ) : entry ? (
        <>
          <div
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-4"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {entry.locationName ? (
              <div className="flex shrink-0 flex-col items-center gap-1 text-center">
                <p className="max-w-full truncate text-sm font-medium text-foreground/70">
                  {pickWalkPlaceTitle(entry, t)}
                </p>
                <p className="font-heading text-6xl leading-none font-semibold tabular-nums">
                  {(entry.locationPosition ?? 0) + 1}
                </p>
                <p className="text-2xs font-medium uppercase tracking-wider text-foreground/50">
                  {t("orders.pickWalk.slot", {
                    position: (entry.locationPosition ?? 0) + 1,
                  })}
                </p>
              </div>
            ) : (
              <div className="flex shrink-0 flex-col items-center gap-1 text-center">
                <p className="max-w-full truncate text-sm font-medium text-foreground/70">
                  {pickWalkPlaceTitle(entry, t)}
                </p>
                <p className="font-heading text-3xl leading-tight font-semibold">
                  {pickWalkSpotLabel(entry, t)}
                </p>
              </div>
            )}
            <div
              className={cn(
                "relative touch-pan-y select-none transition-transform",
                !swiping && "motion-reduce:transition-none",
                picked && "opacity-60",
              )}
              style={
                swiping
                  ? {
                      transform: `translateX(${swipeDelta * 0.6}px) rotate(${swipeDelta * 0.02}deg)`,
                    }
                  : undefined
              }
            >
              <CardThumbnail
                image={entry.card.image}
                className="w-60 max-md:w-52"
              />
              {swiping && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 top-6 text-center text-2xl font-bold uppercase tracking-wider",
                    swipeDelta > 0 ? "text-success-foreground" : "text-warning-strong",
                  )}
                >
                  {swipeDelta > 0
                    ? t("orders.markPicked")
                    : t("orders.batch.focusSkip")}
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1 text-center">
              <p
                className={cn(
                  "text-lg font-semibold",
                  picked && "line-through decoration-1",
                )}
              >
                {entry.card.name}
              </p>
              <p className="text-sm text-foreground/70">
                {pickWalkPrintingLabel(entry, t)}
              </p>
              {pickWalkOrderLabel(entry, showOrderName, t) && (
                <p className="text-xs text-foreground/70">
                  {pickWalkOrderLabel(entry, showOrderName, t)}
                </p>
              )}
            </div>
            <p className="text-2xs text-foreground/50">
              {t("orders.batch.focusSwipeHint")}
            </p>
            <p className="text-2xs tabular-nums text-foreground/50">
              {t("orders.pickWalk.cardPosition", {
                index: cursor + 1,
                total: entries.length,
              })}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-1.5 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {picked && (
              <Callout variant="warning" icon={IconAlertTriangle}>
                {t("orders.batch.focusPickedNote")}
              </Callout>
            )}
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon-lg"
                aria-label={t("orders.pickWalk.cantFindCard", {
                  name: entry.card.name,
                })}
                title={t("orders.pickWalk.cantFindCard", {
                  name: entry.card.name,
                })}
                disabled={!canPick || picked || isReleasing}
                onClick={releaseCurrent}
              >
                <IconEyeOff />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                aria-label={t("orders.batch.focusBackCard")}
                title={t("orders.batch.focusBackCard")}
                disabled={cursor === 0}
                onClick={stepBack}
              >
                <IconChevronLeft />
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={!canPick}
                onClick={pickCurrent}
                aria-label={
                  picked
                    ? t("orders.batch.unpick", { name: entry.card.name })
                    : entry.orderRef == null
                      ? t("orders.pickCopy", { name: entry.card.name })
                      : t("orders.pickCopyForOrder", {
                          name: entry.card.name,
                          order: entry.orderRef,
                        })
                }
              >
                {picked ? <IconX /> : <IconCheck />}
                {picked
                  ? t("orders.batch.unpick", { name: entry.card.name })
                  : t("orders.markPicked")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                aria-label={t("orders.batch.focusSkip")}
                title={t("orders.batch.focusSkip")}
                onClick={skipForward}
              >
                <IconX />
                {t("orders.batch.focusSkip")}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold">{t("orders.pickWalk.allPicked")}</p>
        </div>
      )}
    </div>
  );
}
