import { CardContextMenu } from "@/features/cards/components/card-context-menu";
import { useHiddenDownloadedCount } from "@/features/cards/api/use-hidden-downloaded-count";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { useCardQueryState } from "@/features/cards/api/use-card-filter-sort";
import { useCardFilters } from "@/features/cards/api/use-card-filters";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { ScannedCardTable } from "@/features/cards/components/scanned-card-table";
import { SessionSummaryDialog } from "@/features/cards/components/session-summary-dialog";
import {
  allExportAdapters,
  runExport,
  supportsGame,
  type ExportAdapter,
} from "@/features/cards/lib/export";
import {
  collectionCardPositionQueryOptions,
  collectionCardsExportQueryOptions,
  collectionCardsPageQueryOptions,
  loadCollectionCardIds,
} from "@/features/collections/api/collection-cards";
import { useCollectionCardsSummary } from "@/features/collections/api/use-collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  CARD_GRID_CLASS,
  CARD_GRID_DENSITIES,
  CARD_GRID_DENSITY_CLASS,
} from "@/lib/constants/card-grid";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import {
  CARD_GROUP_DUPLICATES_STORAGE_KEY,
  CARD_GRID_DENSITY_STORAGE_KEY,
  CARD_VIEW_MODE_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import type {
  CardGridDensity,
  CardViewMode,
  SelectToggleOptions,
} from "@/lib/interfaces/cards";
import {
  IconAlbum,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
} from "@tabler/icons-react";
import { computeBinCount } from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { toast } from "@/lib/toast";
import { CARD_REVIEW_SEARCH_PARAM } from "@/lib/constants/cards";
import { useCollectionLocks, useSessionViewersByGuid } from "@/lib/app-stream";

export function CardGrid() {
  const { t } = useTranslation("cards");
  const { activeCollection, isLoading: collectionsLoading } = useCollections();
  const {
    removeCard,
    removeCards,
    clearCards,
    markDownloaded,
    elapsedMs,
    sessionScanCount,
  } = useScannedCards();
  const collectionGuid = activeCollection?.guid;
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
  const moduleCount = useModuleCount();
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    activeFilterCount,
  } = useCardQueryState(fieldDefinitions, { filters, setFilters });
  const {
    allStats: stats,
    totalCount,
    isPending: summaryPending,
  } = useCollectionCardsSummary();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { scanId: openScanId } = useParams<{ scanId?: string }>();
  const [searchParams] = useSearchParams();
  const isReviewing = searchParams.get(CARD_REVIEW_SEARCH_PARAM) === "1";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Keeps the open card in the URL (/app/cards/:scanId) so it's shareable
  // and survives a refresh, rather than living only in component state.
  // Replaces history instead of pushing, so browser back always returns to
  // the grid rather than stepping back through every previously viewed card.
  const setOpenScanId = useCallback(
    (scanId: string | null, review = false) => {
      const reviewSuffix = review ? `?${CARD_REVIEW_SEARCH_PARAM}=1` : "";
      navigate(scanId ? `/app/cards/${scanId}${reviewSuffix}` : "/app", {
        replace: true,
      });
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

  const [density, setDensity] = useState<CardGridDensity>(() => {
    try {
      const stored = localStorage.getItem(CARD_GRID_DENSITY_STORAGE_KEY);
      return CARD_GRID_DENSITIES.includes(stored as CardGridDensity)
        ? (stored as CardGridDensity)
        : "comfortable";
    } catch {
      return "comfortable";
    }
  });

  const handleDensityChange = useCallback((next: CardGridDensity) => {
    setDensity(next);
    try {
      localStorage.setItem(CARD_GRID_DENSITY_STORAGE_KEY, next);
    } catch {}
  }, []);

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

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const cardsQuery = useMemo(
    () => ({
      search: debouncedSearch.toLowerCase().trim(),
      sort: sortKey,
      filters,
      grouped: groupDuplicates,
    }),
    [debouncedSearch, sortKey, filters, groupDuplicates],
  );

  useEffect(() => {
    setPage(0);
  }, [cardsQuery, collectionGuid]);

  const { data: pageData, isPending: pagePending } = useQuery(
    collectionCardsPageQueryOptions(collectionGuid, cardsQuery, page),
  );
  const pagedCards = pageData?.items ?? [];
  const totalCards = pageData?.totalCards ?? 0;
  const hiddenDownloadedCount = useHiddenDownloadedCount(
    cardsQuery,
    !!pageData && totalCards === 0,
  );
  const pageCount = pageData
    ? Math.max(1, Math.ceil(pageData.totalEntries / pageData.pageSize))
    : 1;
  const clampedPage = Math.min(page, pageCount - 1);

  useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
  }, [page, clampedPage]);

  const { data: openPosition, isPending: openPositionPending } = useQuery(
    collectionCardPositionQueryOptions(collectionGuid, openScanId, cardsQuery),
  );
  const openEntry =
    openPosition && openPosition.entry.scanId === openScanId
      ? openPosition.entry
      : null;

  const startReview = useCallback(async () => {
    if (!collectionGuid) return;
    try {
      const firstPage =
        page === 0 && pageData
          ? pageData
          : await queryClient.fetchQuery(
              collectionCardsPageQueryOptions(collectionGuid, cardsQuery, 0),
            );
      const first = firstPage.items[0];
      if (first) setOpenScanId(first.scanId, true);
    } catch (err) {
      console.error("Failed to start card review:", err);
    }
  }, [collectionGuid, page, pageData, queryClient, cardsQuery, setOpenScanId]);

  const finishReview = useCallback(
    (count: number) => {
      setOpenScanId(null);
      toast.success(t("review.complete", { count }));
    },
    [setOpenScanId, t],
  );

  useHotkeys({
    reviewStart:
      !openScanId && totalCards > 0 ? () => void startReview() : undefined,
  });

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

  const selectAnchorRef = useRef<string | null>(null);

  const handleSelect = useCallback(
    (scanId: string, { shiftKey }: SelectToggleOptions) => {
      const index = pagedCards.findIndex((entry) => entry.scanId === scanId);
      const entry = pagedCards[index];
      if (!entry) return;
      const anchorIndex = selectAnchorRef.current
        ? pagedCards.findIndex(
            (candidate) => candidate.scanId === selectAnchorRef.current,
          )
        : -1;
      selectAnchorRef.current = scanId;

      if (!shiftKey || anchorIndex === -1 || anchorIndex === index) {
        toggleSelect(entry.scanIds);
        return;
      }

      const [from, to] =
        anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
      const rangeIds = pagedCards
        .slice(from, to + 1)
        .flatMap((candidate) => candidate.scanIds);
      setSelectedIds((prev) => {
        const select = !entry.scanIds.every((id) => prev.has(id));
        const next = new Set(prev);
        for (const id of rangeIds) {
          if (select) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [pagedCards, toggleSelect],
  );

  const togglePageSelect = useCallback(() => {
    const pageIds = pagedCards.flatMap((entry) => entry.scanIds);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const pageSelected = pageIds.every((id) => next.has(id));
      for (const id of pageIds) {
        if (pageSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [pagedCards]);

  const allSelected =
    totalCards > 0 &&
    selectedIds.size >= totalCards &&
    pagedCards.every((entry) =>
      entry.scanIds.every((id) => selectedIds.has(id)),
    );

  const toggleSelectAll = useCallback(async () => {
    if (allSelected || !collectionGuid) {
      setSelectedIds(new Set());
      return;
    }
    try {
      const ids = await loadCollectionCardIds(collectionGuid, cardsQuery);
      setSelectedIds(new Set(ids));
    } catch (err) {
      console.error("Failed to select all cards:", err);
    }
  }, [allSelected, collectionGuid, cardsQuery]);

  const { data: exportCards } = useQuery(
    collectionCardsExportQueryOptions(collectionGuid, summaryOpen),
  );

  const gameKey = activeCollection?.game?.key;
  const exportAdapters = useMemo(
    () =>
      allExportAdapters.filter((adapter) => supportsGame(adapter, gameKey)),
    [gameKey],
  );
  const [exportingSelected, setExportingSelected] = useState(false);

  const handleExportSelected = useCallback(
    async (adapter: ExportAdapter) => {
      if (!collectionGuid) return;
      setExportingSelected(true);
      try {
        const allCards = await queryClient.fetchQuery(
          collectionCardsExportQueryOptions(collectionGuid, true),
        );
        const selectedCards = allCards.filter((card) =>
          selectedIds.has(card.scanId),
        );
        const slug = (activeCollection?.name ?? "collection")
          .replace(/\s+/g, "-")
          .toLowerCase();
        runExport(
          adapter,
          selectedCards,
          slug,
          { isMtg: gameKey === "mtg", fieldDefinitions },
          true,
        );
        markDownloaded(selectedCards.map((card) => card.scanId));
      } catch (err) {
        console.error("Failed to export selected cards:", err);
        toast.error(t("cardGrid.exportSelectedFailed"));
      } finally {
        setExportingSelected(false);
      }
    },
    [
      collectionGuid,
      queryClient,
      selectedIds,
      activeCollection?.name,
      gameKey,
      fieldDefinitions,
      markDownloaded,
      t,
    ],
  );

  const handleBulkDelete = useCallback(() => {
    removeCards(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [removeCards, selectedIds]);

  const handleClearSession = useCallback(async () => {
    clearCards();
  }, [clearCards]);

  if (activeCollection && (pagePending || summaryPending)) {
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
                    <Skeleton className="h-3 w-8 rounded-sm" />
                    <Skeleton className="h-3 w-6 rounded-sm" />
                  </div>
                  <Skeleton className="h-3 w-8 rounded-sm" />
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
        icon={IconAlbum}
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

  if (totalCount === 0) {
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

  if (openScanId && !openEntry && openPositionPending) {
    return <CardDetailPanelSkeleton />;
  }

  if (openEntry) {
    return (
      <CardDetailPanel
        scanId={openEntry.scanId}
        currentCard={openEntry.card}
        alternativeMatches={openEntry.alternativeMatches}
        needsReview={openEntry.needsReview}
        wasCorrected={openEntry.corrected}
        isFoil={openEntry.isFoil}
        foilType={openEntry.foilType}
        binNumber={openEntry.binNumber}
        onClose={() => setOpenScanId(null)}
        onRemove={() => {
          removeCard(openEntry.scanId);
          setOpenScanId(
            isReviewing ? (openPosition?.nextScanId ?? null) : null,
            isReviewing,
          );
        }}
        onPrev={() =>
          setOpenScanId(openPosition?.prevScanId ?? null, isReviewing)
        }
        onNext={() =>
          setOpenScanId(openPosition?.nextScanId ?? null, isReviewing)
        }
        hasPrev={!!openPosition?.prevScanId}
        hasNext={!!openPosition?.nextScanId}
        currentIndex={openPosition?.index ?? 0}
        total={openPosition?.total ?? 0}
        copyIndex={openPosition?.copyIndex ?? -1}
        copyCount={openPosition?.copyCount ?? 1}
        reviewMode={isReviewing}
        onReviewComplete={() => finishReview(openPosition?.total ?? 0)}
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
          onStartReview={() => void startReview()}
          collectionName={activeCollection?.name}
          onClearAll={handleClearSession}
          hasCards={totalCards > 0}
          activeFilters={filters}
          onFiltersChange={setFilters}
          activeFilterCount={activeFilterCount}
          watchers={viewers}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          availableRarities={stats?.rarities}
          availableColors={stats?.colors}
          availableFoilTypes={stats?.foilTypes}
          binCount={computeBinCount(moduleCount)}
          cardCount={totalCount}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          density={density}
          onDensityChange={handleDensityChange}
          groupDuplicates={groupDuplicates}
          onGroupDuplicatesChange={handleGroupDuplicatesChange}
        />
      </div>
      {totalCards === 0 && (
        <EmptyState
          className="flex-1"
          title={t("cardGrid.noCardsMatchFilters")}
          description={
            hiddenDownloadedCount > 0
              ? t("cardGrid.downloadedHidden", {
                  count: hiddenDownloadedCount,
                })
              : t("cardGrid.tryAdjusting")
          }
          action={
            hiddenDownloadedCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, showDownloaded: true })}
              >
                <IconDownload />
                {t("cardFilterPopover.showDownloadedCards")}
              </Button>
            ) : undefined
          }
        />
      )}
      <div className="p-2 flex-1">
        {viewMode === "list" ? (
          <div className="rounded-lg border">
            <ScannedCardTable
              rows={pagedCards.map((entry) => ({
                scanId: entry.scanId,
                scanIds: entry.scanIds,
                card: entry.card,
                binNumber: entry.binNumber,
                quantity: entry.quantity,
                isFoil: entry.isFoil,
                foilType: entry.foilType,
                isDownloaded: entry.isDownloaded,
                hasAlternatives: !!entry.alternativeMatches?.length,
                needsReview: entry.needsReview,
                wasCorrected: entry.corrected,
                isSelected: entry.scanIds.every((id) => selectedIds.has(id)),
              }))}
              showQuantity={groupDuplicates}
              onOpen={(row) => setOpenScanId(row.scanId)}
              onToggleSelect={(row, options) =>
                handleSelect(row.scanId, options)
              }
              onTogglePageSelect={togglePageSelect}
            />
          </div>
        ) : (
          <div className={CARD_GRID_DENSITY_CLASS[density]}>
            {pagedCards.map((entry) => (
              <CardContextMenu
                key={entry.scanId}
                entry={entry}
                isSelected={entry.scanIds.every((id) => selectedIds.has(id))}
                onOpen={() => setOpenScanId(entry.scanId)}
                onToggleSelect={() =>
                  handleSelect(entry.scanId, { shiftKey: false })
                }
              >
                <ScannedCardItem
                  key={entry.scanId}
                  card={entry.card}
                  scannedAt={entry.scannedAt}
                  onOpen={() => setOpenScanId(entry.scanId)}
                  binNumber={entry.binNumber}
                  isSelected={entry.scanIds.every((id) => selectedIds.has(id))}
                  onToggleSelect={(options) =>
                    handleSelect(entry.scanId, options)
                  }
                  hasAlternatives={!!entry.alternativeMatches?.length}
                  needsReview={entry.needsReview}
                  wasCorrected={entry.corrected}
                  isFoil={entry.isFoil}
                  foilType={entry.foilType}
                  isDownloaded={entry.isDownloaded}
                  quantity={entry.quantity}
                />
              </CardContextMenu>
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
            <span className="text-sm text-foreground/70">
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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    disabled={exportingSelected || exportAdapters.length === 0}
                    className="text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
                  />
                }
              >
                <IconDownload />
                {t("cardGrid.export")}
                <IconChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top">
                {exportAdapters.map((adapter) => (
                  <DropdownMenuItem
                    key={adapter.key}
                    onClick={() => handleExportSelected(adapter)}
                  >
                    {adapter.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
        open={summaryOpen && !!exportCards}
        onOpenChange={setSummaryOpen}
        cards={exportCards ?? []}
        elapsedMs={elapsedMs}
        sessionScanCount={sessionScanCount}
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
