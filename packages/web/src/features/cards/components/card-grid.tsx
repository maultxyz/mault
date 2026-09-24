import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { useCardFilterSort } from "@/features/cards/api/use-card-filter-sort";
import { useCardFilters } from "@/features/cards/api/use-card-filters";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { ScannedCardListItem } from "@/features/cards/components/scanned-card-list-item";
import { SessionSummaryDialog } from "@/features/cards/components/session-summary-dialog";
import {
  groupScannedCards,
  toDisplayEntries,
} from "@/features/cards/lib/group-cards";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { useSessionViewersByGuid } from "@/features/collections/api/use-live-counts";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { computeStats } from "@/features/scanner/lib/compute-stats";

import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import { CARD_PAGE_SIZE as PAGE_SIZE } from "@/lib/constants/limits";
import {
  CARD_GROUP_DUPLICATES_STORAGE_KEY,
  CARD_VIEW_MODE_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import type { CardViewMode } from "@/lib/interfaces/cards";
import {
  IconAlbum,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

export function CardGrid() {
  const { t } = useTranslation("cards");
  const { activeCollection, isLoading: collectionsLoading } = useCollections();
  const {
    cards,
    removeCard,
    removeCards,
    clearCards,
    markDownloaded,
    isLoading,
    elapsedMs,
  } = useScannedCards();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { locks, currentUserId } = useCollectionLocks();
  const isScanningActive = !!(
    activeCollection && locks[activeCollection.guid]?.userId === currentUserId
  );
  const viewersByGuid = useSessionViewersByGuid();
  const viewers =
    isScanningActive && activeCollection
      ? viewersByGuid[activeCollection.guid]?.filter(
          (v) => v.userId !== currentUserId,
        )
      : undefined;
  const { filters, setFilters } = useCardFilters();
  const { fieldDefinitions } = useBinConfigs();
  const {
    filteredAndSorted,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    activeFilterCount,
  } = useCardFilterSort(cards, fieldDefinitions, { filters, setFilters });
  const stats = useMemo(() => computeStats(cards), [cards]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { scanId: openScanId } = useParams<{ scanId?: string }>();
  const navigate = useNavigate();
  // Keeps the open card in the URL (/app/cards/:scanId) so it's shareable
  // and survives a refresh, rather than living only in component state.
  // Replaces history instead of pushing, so browser back always returns to
  // the grid rather than stepping back through every previously viewed card.
  const setOpenScanId = useCallback(
    (scanId: string | null) => {
      navigate(scanId ? `/app/cards/${scanId}` : "/app", { replace: true });
    },
    [navigate],
  );
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<CardViewMode>(() => {
    try {
      return localStorage.getItem(CARD_VIEW_MODE_STORAGE_KEY) === "list"
        ? "list"
        : "grid";
    } catch {
      return "grid";
    }
  });

  const handleViewModeChange = useCallback((mode: CardViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(CARD_VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  }, []);

  const [groupDuplicates, setGroupDuplicates] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CARD_GROUP_DUPLICATES_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const handleGroupDuplicatesChange = useCallback((grouped: boolean) => {
    setGroupDuplicates(grouped);
    try {
      localStorage.setItem(
        CARD_GROUP_DUPLICATES_STORAGE_KEY,
        grouped ? "1" : "0",
      );
    } catch {}
  }, []);

  const displayEntries = useMemo(
    () => toDisplayEntries(filteredAndSorted, groupDuplicates),
    [filteredAndSorted, groupDuplicates],
  );

  const pageCount = Math.max(1, Math.ceil(displayEntries.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pagedCards = displayEntries.slice(
    clampedPage * PAGE_SIZE,
    (clampedPage + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters, sortKey, activeCollection?.guid, groupDuplicates]);

  // Prev/next walks every individual scan, but a grouped tile's duplicates
  // are placed adjacently (regardless of when they were actually scanned)
  // so stepping through them visits every copy before moving to the next
  // distinct card, instead of following raw scan-time order.
  const navigationList = useMemo(
    () => displayEntries.flatMap((entry) => entry.scanIds),
    [displayEntries],
  );
  const cardsByScanId = useMemo(
    () => new Map(filteredAndSorted.map((c) => [c.scanId, c] as const)),
    [filteredAndSorted],
  );
  const openIndex = openScanId ? navigationList.indexOf(openScanId) : -1;
  const openEntry =
    openIndex >= 0
      ? (cardsByScanId.get(navigationList[openIndex]) ?? null)
      : null;

  const duplicateGroups = useMemo(
    () => groupScannedCards(filteredAndSorted),
    [filteredAndSorted],
  );
  const openGroup = openEntry
    ? duplicateGroups.find((g) => g.scanIds.includes(openEntry.scanId))
    : undefined;
  const openCopyIndex =
    openEntry && openGroup ? openGroup.scanIds.indexOf(openEntry.scanId) : -1;
  const openCopyCount = openGroup?.quantity ?? 1;

  const toggleSelect = useCallback((scanIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = scanIds.every((id) => next.has(id));
      for (const id of scanIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const allSelected =
    displayEntries.length > 0 &&
    displayEntries.every((entry) =>
      entry.scanIds.every((id) => selectedIds.has(id)),
    );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allCurrentlySelected =
        filteredAndSorted.length > 0 &&
        filteredAndSorted.every((card) => prev.has(card.scanId));
      return allCurrentlySelected
        ? new Set()
        : new Set(filteredAndSorted.map((card) => card.scanId));
    });
  }, [filteredAndSorted]);

  const handleBulkDelete = useCallback(() => {
    removeCards(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [removeCards, selectedIds]);

  const handleClearSession = useCallback(async () => {
    clearCards();
  }, [clearCards]);

  if (isLoading) {
    return (
      <>
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl p-2 border-b">
          <div className="flex flex-row gap-2 items-center w-full">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-full sm:w-64 rounded-md shrink-0" />
            <Skeleton className="size-9 rounded-md shrink-0" />
            <Skeleton className="size-9 rounded-md shrink-0" />
            <Skeleton className="size-9 rounded-md shrink-0" />
          </div>
        </div>
        <div className="p-2 flex-1">
          <div className={CARD_GRID_CLASS}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-lg p-1 bg-muted border">
                <Skeleton className="aspect-[2.5/3.5] rounded-lg" />
                <div className="flex flex-row justify-between items-center px-1 pb-1">
                  <div className="flex flex-row items-center gap-2">
                    <Skeleton className="size-3 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-8 rounded" />
                    <Skeleton className="h-3 w-6 rounded" />
                  </div>
                  <Skeleton className="h-3 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!collectionsLoading && !activeCollection) {
    return (
      <EmptyState
        icon={<IconAlbum className="size-10" />}
        title={t("cardGrid.noCollectionSelected")}
        description={t("cardGrid.createOrSelectCollection")}
        action={
          <Button
            variant="outline"
            size="sm"
            render={
              <Link to="/app/collections">
                {t("cardGrid.manageCollections")}
              </Link>
            }
          ></Button>
        }
      />
    );
  }

  if (cards.length === 0) {
    return (
      <>
        <NoGameBanner />
        <EmptyState
          className="flex-1"
          title={t("cardGrid.noCardsScanned")}
          description={t("cardGrid.scanToGetStarted")}
        />
      </>
    );
  }

  if (openEntry) {
    return (
      <CardDetailPanel
        scanId={openEntry.scanId}
        currentCard={openEntry.card}
        alternativeMatches={openEntry.alternativeMatches}
        isFoil={openEntry.isFoil}
        foilType={openEntry.foilType}
        binNumber={openEntry.binNumber}
        onClose={() => setOpenScanId(null)}
        onRemove={() => {
          removeCard(openEntry.scanId);
          setOpenScanId(null);
        }}
        onPrev={() => setOpenScanId(navigationList[openIndex - 1] ?? null)}
        onNext={() => setOpenScanId(navigationList[openIndex + 1] ?? null)}
        hasPrev={openIndex > 0}
        hasNext={openIndex < navigationList.length - 1}
        currentIndex={openIndex}
        total={navigationList.length}
        copyIndex={openCopyIndex}
        copyCount={openCopyCount}
      />
    );
  }

  return (
    <>
      <NoGameBanner />
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl p-2 border-b">
        <CardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          sortableFields={sortableFields}
          onExport={() => setSummaryOpen(true)}
          collectionName={activeCollection?.name}
          onClearAll={handleClearSession}
          hasCards={filteredAndSorted.length > 0}
          activeFilters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
          watchers={viewers}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          availableRarities={stats?.rarities}
          availableColors={stats?.colors}
          availableFoilTypes={stats?.foilTypes}
          cardCount={cards.length}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          groupDuplicates={groupDuplicates}
          onGroupDuplicatesChange={handleGroupDuplicatesChange}
        />
      </div>
      {filteredAndSorted.length === 0 && (
        <EmptyState
          className="flex-1"
          title={t("cardGrid.noCardsMatchFilters")}
          description={t("cardGrid.tryAdjusting")}
        />
      )}
      <div className="p-2 flex-1">
        {viewMode === "list" ? (
          <div className="flex flex-col gap-1.5">
            {pagedCards.map((entry) => (
              <ScannedCardListItem
                key={entry.scanId}
                card={entry.card}
                onOpen={() => setOpenScanId(entry.scanId)}
                binNumber={entry.binNumber}
                isSelected={entry.scanIds.every((id) => selectedIds.has(id))}
                onToggleSelect={() => toggleSelect(entry.scanIds)}
                hasAlternatives={!!entry.alternativeMatches?.length}
                wasCorrected={entry.corrected}
                isFoil={entry.isFoil}
                foilType={entry.foilType}
                isDownloaded={entry.isDownloaded}
                quantity={entry.quantity}
              />
            ))}
          </div>
        ) : (
          <div className={CARD_GRID_CLASS}>
            {pagedCards.map((entry) => (
              <ScannedCardItem
                key={entry.scanId}
                card={entry.card}
                onOpen={() => setOpenScanId(entry.scanId)}
                binNumber={entry.binNumber}
                isSelected={entry.scanIds.every((id) => selectedIds.has(id))}
                onToggleSelect={() => toggleSelect(entry.scanIds)}
                hasAlternatives={!!entry.alternativeMatches?.length}
                wasCorrected={entry.corrected}
                isFoil={entry.isFoil}
                foilType={entry.foilType}
                isDownloaded={entry.isDownloaded}
                quantity={entry.quantity}
              />
            ))}
          </div>
        )}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
            >
              <IconChevronLeft />
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("cardGrid.pageOf", {
                page: clampedPage + 1,
                total: pageCount,
              })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={clampedPage === pageCount - 1}
            >
              <IconChevronRight />
            </Button>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div
          role="status"
          className="sticky bottom-4 z-50 mx-auto mb-4 flex w-fit shrink-0 items-center gap-3 rounded-lg bg-foreground px-1.5 pl-3 py-1.5 text-xs text-background shadow-2xl ring-1 ring-foreground/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-150"
        >
          <span className="font-medium">
            {t("cardGrid.cardsSelected", { count: selectedIds.size })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
              onClick={() => setSelectedIds(new Set())}
            >
              {t("cardGrid.clear")}
            </Button>
            <Button
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
              onClick={() => setConfirmOpen(true)}
            >
              {t("cardGrid.delete")}
            </Button>
          </div>
        </div>
      )}

      <SessionSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        cards={cards}
        elapsedMs={elapsedMs}
        collectionName={activeCollection?.name ?? "collection"}
        onMarkDownloaded={markDownloaded}
        gridFilters={filters}
        gridFilterCount={activeFilterCount}
      />

      <DeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("cardGrid.deleteCardsTitle", { count: selectedIds.size })}
        description={t("cardGrid.deleteCardsDescription", {
          count: selectedIds.size,
        })}
        confirm={
          selectedIds.size > 100 ? { type: "keyword" } : { type: "simple" }
        }
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
