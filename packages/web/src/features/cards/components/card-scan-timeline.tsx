import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatScanTimelineBucketLabel } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "@/hooks/use-in-view";
import { CARD_SCAN_TIMELINE_LOAD_AHEAD_MARGIN } from "@/lib/constants/card-grid";
import type { CardScanTimelineProps } from "@/lib/interfaces/cards";
import { IconLoader2 } from "@tabler/icons-react";

export function CardScanTimeline({
  blocks,
  grouping,
  loadedCardCount,
  totalCardCount,
  hasMoreCards,
  isLoadingMoreCards,
  onLoadMoreCards,
  selectedScanIds,
  stickyHeaderTopOffset,
  onToggleBlockSelect,
  renderBlockCards,
}: CardScanTimelineProps) {
  const { t, i18n } = useTranslation("cards");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreIsNearViewport = useInView(loadMoreRef, {
    rootMargin: CARD_SCAN_TIMELINE_LOAD_AHEAD_MARGIN,
  });

  useEffect(() => {
    if (loadMoreIsNearViewport && hasMoreCards && !isLoadingMoreCards) {
      onLoadMoreCards();
    }
  }, [loadMoreIsNearViewport, hasMoreCards, isLoadingMoreCards, onLoadMoreCards]);

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => {
        const label = formatScanTimelineBucketLabel(
          block.bucketKey,
          grouping,
          i18n.language,
        );
        const blockScanIds = block.cards.flatMap((card) => card.scanIds);
        const selectedInBlock = blockScanIds.filter((id) =>
          selectedScanIds.has(id),
        ).length;
        const headingId = `scan-timeline-${block.bucketKey}`;
        return (
          <section
            key={block.bucketKey}
            aria-labelledby={headingId}
            className="flex flex-col gap-2"
          >
            <div
              className="sticky z-40 flex items-center gap-3 bg-background/80 py-1.5 backdrop-blur-2xl"
              style={{ top: stickyHeaderTopOffset }}
            >
              <div aria-hidden className="h-px flex-1 bg-border" />
              <div className="flex min-w-0 items-center gap-2 rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                {onToggleBlockSelect && (
                  <Checkbox
                    aria-label={t("scanTimeline.selectBlock", { period: label })}
                    checked={
                      blockScanIds.length > 0 &&
                      selectedInBlock === blockScanIds.length
                    }
                    indeterminate={
                      selectedInBlock > 0 &&
                      selectedInBlock < blockScanIds.length
                    }
                    onCheckedChange={() => onToggleBlockSelect(block)}
                  />
                )}
                <h2 id={headingId} className="truncate text-xs font-semibold">
                  {label}
                </h2>
                <span className="shrink-0 text-xs text-secondary-foreground/70">
                  {t("scanTimeline.blockCardCount", { count: block.cardCount })}
                </span>
              </div>
              <div aria-hidden className="h-px flex-1 bg-border" />
            </div>
            {renderBlockCards(block)}
          </section>
        );
      })}
      <div ref={loadMoreRef} className="flex flex-col items-center gap-2 pb-4">
        <p role="status" className="text-xs text-foreground/70">
          {t("scanTimeline.loadedOfTotal", {
            loaded: loadedCardCount,
            total: totalCardCount,
          })}
        </p>
        {isLoadingMoreCards && (
          <div className="flex w-full flex-col gap-2" aria-hidden>
            <Skeleton className="h-5 w-48 rounded-sm" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        )}
        {hasMoreCards && (
          <Button
            variant="outline"
            disabled={isLoadingMoreCards}
            onClick={onLoadMoreCards}
          >
            {isLoadingMoreCards && (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {t("scanTimeline.loadMore")}
          </Button>
        )}
      </div>
    </div>
  );
}
