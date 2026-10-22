import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unmatchedCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { UnmatchedCardDetail } from "@/features/scanner/components/unmatched-card-detail";
import { UnmatchedCardTile } from "@/features/scanner/components/unmatched-card-tile";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import type { UnmatchedCardsBrowserProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { UNMATCHED_PAGE_SIZE } from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconChecks,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsBrowser({
  collectionGuid,
  openIndex,
  onOpenIndexChange: setOpenIndex,
  canIdentify,
  onRemove,
  onClose,
  className,
}: UnmatchedCardsBrowserProps) {
  const { t } = useTranslation("scanner");
  const [page, setPage] = useState(1);
  const { data, isPending } = useQuery({
    ...unmatchedCardsPageQueryOptions(collectionGuid, page),
    enabled: openIndex == null,
  });

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / UNMATCHED_PAGE_SIZE));
  if (data && page > pageCount) setPage(pageCount);
  const pageStart = (page - 1) * UNMATCHED_PAGE_SIZE;

  const closeDetail = () => {
    if (openIndex != null) {
      setPage(Math.floor(openIndex / UNMATCHED_PAGE_SIZE) + 1);
    }
    setOpenIndex(null);
  };

  if (openIndex != null) {
    return (
      <div className={cn("flex flex-1 flex-col", className)}>
        <UnmatchedCardDetail
          collectionGuid={collectionGuid}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={closeDetail}
          canIdentify={canIdentify}
          onRemove={onRemove}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/80 p-2 backdrop-blur-2xl">
        <div className="flex min-w-0 items-center gap-2">
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              <IconArrowLeft />
              {t("unmatchedCardsPanel.backToCards")}
            </Button>
          )}
          <p className="truncate text-sm font-medium">
            {t("unmatchedCardsPanel.heading", { count: total })}
          </p>
        </div>
        <Button
          className="shrink-0"
          disabled={total === 0}
          onClick={() => setOpenIndex(0)}
        >
          <IconPlayerPlay />
          {t("unmatchedCardsPanel.startReview")}
        </Button>
      </div>

      {isPending ? (
        <div className={cn(CARD_GRID_CLASS, "p-2")}>
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2.5/3.5] rounded-lg" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={IconChecks}
          title={t("unmatchedCardsPanel.emptyTitle")}
          description={t("unmatchedCardsPanel.emptyDescription")}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 p-2">
          <div className={CARD_GRID_CLASS}>
            {cards.map((entry, i) => (
              <UnmatchedCardTile
                key={entry.scanId}
                entry={entry}
                onOpen={() => setOpenIndex(pageStart + i)}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="icon"
                aria-label={t("unmatchedCardsPanel.previousPage")}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <IconChevronLeft />
              </Button>
              <span className="text-sm text-foreground/70">
                {t("unmatchedCardsPanel.pageOf", { page, total: pageCount })}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("unmatchedCardsPanel.nextPage")}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
              >
                <IconChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
