import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { SelectionActionBar } from "@/components/selection-action-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unmatchedCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { invalidateUnmatchedCards } from "@/features/collections/lib/card-page-cache";
import { useRetryUnmatchedCards } from "@/features/scanner/api/use-retry-unmatched-cards";
import { useUnmatchedCardSelection } from "@/features/scanner/api/use-unmatched-card-selection";
import { UnmatchedCardDetail } from "@/features/scanner/components/unmatched-card-detail";
import { UnmatchedCardTile } from "@/features/scanner/components/unmatched-card-tile";
import {
  CARD_GRID_CLASS,
  SELECTION_ACTION_BAR_BUTTON_CLASS,
  SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS,
} from "@/lib/constants/card-grid";
import type { UnmatchedCardsBrowserProps } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { setPageSize, usePageSize } from "@/lib/page-size-store";
import {
  removeUnmatchedScans,
  UNMATCHED_BULK_SELECTION_MAX,
} from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconChecks,
  IconListCheck,
  IconPlayerPlay,
  IconPlayerStop,
  IconTextScan2,
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
  const pageSize = usePageSize();
  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };
  const [isRemoveAllDialogOpen, setIsRemoveAllDialogOpen] = useState(false);
  const [isRemovingAll, setIsRemovingAll] = useState(false);
  const [isRetryDialogOpen, setIsRetryDialogOpen] = useState(false);
  const [isRemoveSelectedDialogOpen, setIsRemoveSelectedDialogOpen] =
    useState(false);
  const [isRemovingSelected, setIsRemovingSelected] = useState(false);
  const retry = useRetryUnmatchedCards(collectionGuid);
  const selection = useUnmatchedCardSelection();
  const selectedCount = selection.selectedScanIds.length;
  const canSelect = canIdentify || onRemove != null;
  const isBulkActionRunning =
    retry.isRetrying || isRemovingAll || isRemovingSelected;
  const { data, isPending } = useQuery({
    ...unmatchedCardsPageQueryOptions(collectionGuid, page, pageSize),
    enabled: openIndex == null,
  });

  const cards = data?.cards ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (data && page > pageCount) setPage(pageCount);
  const pageStart = (page - 1) * pageSize;

  const closeDetail = () => {
    if (openIndex != null) {
      setPage(Math.floor(openIndex / pageSize) + 1);
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

  const retrySelected = () => {
    const scanIds = selection.selectedScanIds;
    setIsRetryDialogOpen(false);
    selection.clear();
    void retry.start(scanIds);
  };

  const removeSelected = async () => {
    if (!onRemove || isRemovingSelected) return;
    const scanIds = selection.selectedScanIds;
    setIsRemovingSelected(true);
    const { removedCount, failedCount } = await removeUnmatchedScans({
      scanIds,
      removeScan: onRemove,
    });
    selection.clear();
    if (removedCount > 0) {
      toast.success(
        t("unmatchedCardsPanel.selection.removed", { count: removedCount }),
      );
    }
    if (failedCount > 0) {
      toast.error(
        t("unmatchedCardsPanel.selection.removeFailed", { count: failedCount }),
      );
    }
    await invalidateUnmatchedCards(queryClient, collectionGuid);
    setIsRemovingSelected(false);
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {retry.progress && (
            <span role="status" className="text-xs text-foreground/70 tabular-nums">
              {t("unmatchedCardsPanel.retry.progress", {
                checked: retry.progress.checkedCount,
                total: retry.progress.totalCount,
                count: retry.progress.matchedCount,
              })}
            </span>
          )}
          {retry.isRetrying && (
            <Button variant="outline" onClick={retry.stop}>
              <IconPlayerStop />
              {t("unmatchedCardsPanel.retry.stop")}
            </Button>
          )}
          {onRemoveAll && (
            <Button
              variant="outline"
              disabled={total === 0 || isBulkActionRunning}
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
      <ConfirmDialog
        open={isRetryDialogOpen}
        onOpenChange={setIsRetryDialogOpen}
        title={t("unmatchedCardsPanel.retry.confirmTitle", {
          count: selectedCount,
        })}
        description={t("unmatchedCardsPanel.retry.confirmDescription")}
        confirmLabel={t("unmatchedCardsPanel.retry.confirm")}
        cancelLabel={t("common:actions.cancel")}
        onConfirm={retrySelected}
      />
      {onRemove && (
        <DeleteDialog
          open={isRemoveSelectedDialogOpen}
          onOpenChange={setIsRemoveSelectedDialogOpen}
          title={t("unmatchedCardsPanel.selection.removeTitle", {
            count: selectedCount,
          })}
          description={t("unmatchedCardsPanel.removeAllDescription")}
          confirmLabel={t("unmatchedCardsPanel.selection.remove")}
          onConfirm={() => void removeSelected()}
        />
      )}
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
          <ListPagination
            alignsEnd
            className="pb-2"
            pagination={{
              page,
              pageCount,
              setPage,
              from: pageStart + 1,
              to: pageStart + cards.length,
              total,
            }}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
          />
          {canSelect && (
            <p className="pb-2 text-xs text-foreground/70">
              {t("unmatchedCardsPanel.selection.hint", {
                max: UNMATCHED_BULK_SELECTION_MAX,
              })}
            </p>
          )}
          <div className={CARD_GRID_CLASS}>
            {cards.map((entry, i) => (
              <UnmatchedCardTile
                key={entry.scanId}
                entry={entry}
                onOpen={() => setOpenIndex(pageStart + i)}
                isSelected={selection.isSelected(entry.scanId)}
                onToggleSelect={
                  canSelect && !isBulkActionRunning
                    ? () => selection.toggle(entry.scanId)
                    : undefined
                }
              />
            ))}
          </div>
          <ListPagination
            alignsEnd
            className="pt-4"
            pagination={{
              page,
              pageCount,
              setPage,
              from: pageStart + 1,
              to: pageStart + cards.length,
              total,
            }}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
          />
        </div>
      )}
      {selectedCount > 0 && (
        <SelectionActionBar
          selectedCount={selectedCount}
          selectionLabel={t("unmatchedCardsPanel.selection.selected", {
            count: selectedCount,
          })}
          onClear={selection.clear}
        >
          <Button
            variant="ghost"
            className={SELECTION_ACTION_BAR_BUTTON_CLASS}
            disabled={cards.every((entry) => selection.isSelected(entry.scanId))}
            onClick={() =>
              selection.selectMany(cards.map((entry) => entry.scanId))
            }
          >
            <IconListCheck />
            {t("unmatchedCardsPanel.selection.selectPage")}
          </Button>
          {canIdentify && (
            <Button
              variant="ghost"
              className={SELECTION_ACTION_BAR_BUTTON_CLASS}
              disabled={isBulkActionRunning}
              onClick={() => setIsRetryDialogOpen(true)}
            >
              <IconTextScan2 />
              {t("unmatchedCardsPanel.retry.action")}
            </Button>
          )}
          {onRemove && (
            <Button
              className={SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS}
              disabled={isBulkActionRunning}
              onClick={() => setIsRemoveSelectedDialogOpen(true)}
            >
              <IconTrash />
              {t("unmatchedCardsPanel.selection.remove")}
            </Button>
          )}
        </SelectionActionBar>
      )}
    </div>
  );
}
