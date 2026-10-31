import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unmatchedCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { invalidateUnmatchedCards } from "@/features/collections/lib/card-page-cache";
import { UnmatchedCardDetail } from "@/features/scanner/components/unmatched-card-detail";
import { UnmatchedCardTile } from "@/features/scanner/components/unmatched-card-tile";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import type { UnmatchedCardsBrowserProps } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { UNMATCHED_PAGE_SIZE } from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconChecks,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmatchedCardsBrowser({
  collectionGuid,
  openIndex,
  onOpenIndexChange: setOpenIndex,
  canIdentify,
  onRemove,
  onRemoveAll,
  onClose,
  className,
}: UnmatchedCardsBrowserProps) {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isRemoveAllDialogOpen, setIsRemoveAllDialogOpen] = useState(false);
  const [isRemovingAll, setIsRemovingAll] = useState(false);
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

  const removeAll = async () => {
    if (!onRemoveAll || isRemovingAll) return;
    setIsRemovingAll(true);
    const removedAll = await onRemoveAll();
    if (removedAll) {
      toast.success(t("unmatchedCardsPanel.removedAll", { count: total }));
      setPage(1);
    } else {
      toast.error(t("unmatchedCardsPanel.removeAllFailed"));
    }
    await invalidateUnmatchedCards(queryClient, collectionGuid);
    setIsRemovingAll(false);
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
        <div className="flex shrink-0 items-center gap-1.5">
          {onRemoveAll && (
            <Button
              variant="outline"
              disabled={total === 0 || isRemovingAll}
              onClick={() => setIsRemoveAllDialogOpen(true)}
            >
              <IconTrash />
              {t("unmatchedCardsPanel.removeAll")}
            </Button>
          )}
          <Button disabled={total === 0} onClick={() => setOpenIndex(0)}>
            <IconPlayerPlay />
            {t("unmatchedCardsPanel.startReview")}
          </Button>
        </div>
      </div>
      {onRemoveAll && (
        <DeleteDialog
          open={isRemoveAllDialogOpen}
          onOpenChange={setIsRemoveAllDialogOpen}
          title={t("unmatchedCardsPanel.removeAllTitle", { count: total })}
          description={t("unmatchedCardsPanel.removeAllDescription")}
          confirmLabel={t("unmatchedCardsPanel.removeAll")}
          onConfirm={() => void removeAll()}
        />
      )}

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
          <ListPagination
            className="pt-4"
            pagination={{ page, pageCount, setPage }}
          />
        </div>
      )}
    </div>
  );
}
