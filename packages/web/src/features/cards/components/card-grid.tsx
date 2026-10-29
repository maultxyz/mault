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
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { useCardQueryState } from "@/features/cards/api/use-card-filter-sort";
import {
  useCardGridDensity,
  useCardViewPreferences,
  useReviewLayout,
} from "@/features/cards/api/use-card-view-preferences";
import { useCardFilters } from "@/features/cards/api/use-card-filters";
import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import { CardDetailPanel } from "@/features/cards/components/card-detail-panel";
import { CardDetailPanelSkeleton } from "@/features/cards/components/card-detail-panel-skeleton";
import { AddCardDialog } from "@/features/cards/components/add-card-dialog";
import { useScanImageImport } from "@/features/scanner/api/use-scan-image-import";
import { ScanImageImportDialog } from "@/features/scanner/components/scan-image-import-dialog";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import { ExportedCardsDialog } from "@/features/cards/components/exported-cards-dialog";
import { StorageDeleteWarning } from "@/features/cards/components/storage-delete-warning";
import { ScannedCardItem } from "@/features/cards/components/scanned-card-item";
import { ScannedCardTable } from "@/features/cards/components/scanned-card-table";
import { ReviewGrid } from "@/features/cards/components/review-grid";
import { SessionSummaryDialog } from "@/features/cards/components/session-summary-dialog";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useMoveCardsToLocation } from "@/features/storage/api/use-storage-locations";
import {
  allExportAdapters,
  runExport,
  supportsGame,
  type ExportAdapter,
} from "@/features/cards/lib/export";
import {
  collectionCardPositionQueryOptions,
  collectionCardsPageQueryOptions,
  collectionCardsCountQueryOptions,
  loadCardsForExport,
  loadCollectionCardIds,
} from "@/features/collections/api/collection-cards";
import { useCollectionCardsSummary } from "@/features/collections/api/use-collection-cards";
import { useStoredCardCount } from "@/features/collections/api/use-stored-card-count";
import { useCollectionCardActions } from "@/features/collections/api/use-collection-card-actions";
import { useMarkCardsDownloaded } from "@/features/collections/api/use-mark-cards-downloaded";
import { useViewedCollection } from "@/features/collections/api/use-viewed-collection";
import { CardDetailScopeContext } from "@/features/cards/api/use-card-detail-scope";
import {
  loadCollectionPositionStep,
  usePrefetchDetailCards,
} from "@/features/cards/api/use-prefetch-detail-cards";
import { collectionViewPath } from "@/lib/constants/collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  CARD_GRID_CLASS,
  CARD_GRID_DENSITY_CLASS,
} from "@/lib/constants/card-grid";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type {
  OpenScanOptions,
  SelectToggleOptions,
} from "@/lib/interfaces/cards";
import {
  IconAlbum,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconPhotoUp,
  IconPlus,
  IconRosette,
  IconSparkles,
} from "@tabler/icons-react";
import {
  CARD_CONDITIONS,
  computeBinCount,
  toReviewGridCard,
} from "@magic-vault/shared";
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
import { useReviewSession } from "@/hooks/use-review-session";
import { toast } from "@/lib/toast";
import {
  CARD_REVIEW_GRID_PARAM_VALUE,
  CARD_REVIEW_SEARCH_PARAM,
} from "@/lib/constants/cards";
import { useCollectionLocks, useSessionViewersByGuid } from "@/lib/app-stream";

export function CardGrid() {
  const { t } = useTranslation("cards");
  const {
    collection: viewedCollection,
    isViewingOther: readOnly,
    isLoading: collectionsLoading,
  } = useViewedCollection();
  const viewedCardActions = useCollectionCardActions(viewedCollection?.guid);
  const {
    removeCard,
    removeCards,
    clearCards,
    correctCard,
    setCardsCondition,
    setCardsFoilType,
    elapsedMs,
    sessionScanCount,
  } = useScannedCards();
  const collectionGuid = viewedCollection?.guid;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [importScansOpen, setImportScansOpen] = useState(false);
  const scanImageImport = useScanImageImport(collectionGuid);
  const { locks, currentUserId } = useCollectionLocks();
  const isScanningActive = !!(
    viewedCollection && locks[viewedCollection.guid]?.userId === currentUserId
  );
  const viewersByGuid = useSessionViewersByGuid();
  const viewers =
    isScanningActive && viewedCollection
      ? viewersByGuid[viewedCollection.guid]?.filter(
          (v) => v.userId !== currentUserId,
        )
      : undefined;
  const { filters, setFilters } = useCardFilters();
  const fieldDefinitions = useMemo(
    () => viewedCollection?.game?.fieldDefinitions ?? [],
    [viewedCollection?.game?.fieldDefinitions],
  );
  const moduleCount = useModuleCount();
  const foilOptions = useFoilOptions();
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
  const reviewParam = searchParams.get(CARD_REVIEW_SEARCH_PARAM);
  const isReviewing = reviewParam === "1";
  const isGridReviewing =
    !readOnly && !openScanId && reviewParam === CARD_REVIEW_GRID_PARAM_VALUE;
  const [reviewLayout, setReviewLayout] = useReviewLayout();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const basePath =
    readOnly && viewedCollection
      ? collectionViewPath(viewedCollection.guid)
      : "/app";
  const setOpenScanId = useCallback(
    (scanId: string | null, { inReviewMode = false }: OpenScanOptions = {}) => {
      const reviewSuffix = inReviewMode
        ? `?${CARD_REVIEW_SEARCH_PARAM}=1`
        : "";
      navigate(
        scanId ? `${basePath}/cards/${scanId}${reviewSuffix}` : basePath,
        { replace: true },
      );
    },
    [navigate, basePath],
  );
  const openReviewGrid = useCallback(() => {
    setReviewLayout("grid");
    navigate(
      `${basePath}?${CARD_REVIEW_SEARCH_PARAM}=${CARD_REVIEW_GRID_PARAM_VALUE}`,
      { replace: true },
    );
  }, [navigate, basePath, setReviewLayout]);
  const [page, setPage] = useState(0);
  const {
    viewMode,
    handleViewModeChange,
    groupDuplicates,
    handleGroupDuplicatesChange,
  } = useCardViewPreferences();
  const [density, handleDensityChange] = useCardGridDensity();

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
  const reviewQuery = useMemo(
    () => ({ ...cardsQuery, unreviewed: true }),
    [cardsQuery],
  );
  const [reviewTotal, setReviewTotal] = useState<number | null>(null);
  const { data: reviewCount } = useQuery({
    ...collectionCardsCountQueryOptions(collectionGuid, reviewQuery),
    enabled: !readOnly && !!collectionGuid,
  });
  const reviewSession = useReviewSession(openScanId, isReviewing);
  const reviewGridQuery = useMemo(
    () => ({ ...reviewQuery, grouped: false }),
    [reviewQuery],
  );
  const reviewGridPage = useQuery({
    ...collectionCardsPageQueryOptions(collectionGuid, reviewGridQuery, 0),
    enabled: isGridReviewing && !!collectionGuid,
    placeholderData: undefined,
  });
  const reviewGridCards = useMemo(
    () =>
      collectionGuid
        ? (reviewGridPage.data?.items ?? []).map((entry) =>
            toReviewGridCard(collectionGuid, entry),
          )
        : [],
    [collectionGuid, reviewGridPage.data],
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
    collectionCardPositionQueryOptions(
      collectionGuid,
      openScanId,
      isReviewing ? reviewQuery : cardsQuery,
    ),
  );
  const openEntry =
    openPosition && openPosition.entry.scanId === openScanId
      ? openPosition.entry
      : null;
  const loadPrefetchStep = useCallback(
    (scanId: string) =>
      loadCollectionPositionStep(
        queryClient,
        collectionGuid!,
        scanId,
        isReviewing ? reviewQuery : cardsQuery,
      ),
    [queryClient, collectionGuid, isReviewing, reviewQuery, cardsQuery],
  );
  usePrefetchDetailCards(
    openEntry
      ? isReviewing
        ? reviewSession.resolveNext(openPosition?.nextScanId)
        : openPosition?.nextScanId
      : null,
    !!collectionGuid,
    loadPrefetchStep,
  );

  const startOneByOneReview = useCallback(async () => {
    if (!collectionGuid) return;
    try {
      const firstPage = await queryClient.fetchQuery(
        collectionCardsPageQueryOptions(collectionGuid, reviewQuery, 0),
      );
      const first = firstPage.items[0];
      if (!first) {
        toast.info(t("review.nothingLeft"));
        return;
      }
      setReviewTotal(firstPage.totalCards);
      setOpenScanId(first.scanId, { inReviewMode: true });
    } catch (err) {
      console.error("Failed to start card review:", err);
    }
  }, [collectionGuid, queryClient, reviewQuery, setOpenScanId, t]);

  const startReview = useCallback(() => {
    if (reviewLayout === "grid") openReviewGrid();
    else void startOneByOneReview();
  }, [reviewLayout, openReviewGrid, startOneByOneReview]);

  const finishReview = useCallback(
    (count: number) => {
      setOpenScanId(null);
      toast.success(t("review.complete", { count: reviewTotal ?? count }));
      setReviewTotal(null);
    },
    [setOpenScanId, reviewTotal, t],
  );

  useHotkeys({
    reviewStart:
      !readOnly && !openScanId && !isGridReviewing && totalCards > 0
        ? startReview
        : undefined,
    clearSelection:
      selectedIds.size > 0 ? () => setSelectedIds(new Set()) : undefined,
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

  const gameKey = viewedCollection?.game?.key;
  const exportAdapters = useMemo(
    () =>
      allExportAdapters.filter((adapter) => supportsGame(adapter, gameKey)),
    [gameKey],
  );
  const [exportingSelected, setExportingSelected] = useState(false);
  const [exportedScanIds, setExportedScanIds] = useState<string[] | null>(
    null,
  );
  const exportedCount = exportedScanIds?.length ?? 0;
  const [confirmDeleteExported, setConfirmDeleteExported] = useState(false);
  const markCardsDownloaded = useMarkCardsDownloaded(collectionGuid);
  const { isLocked: storageLocked } = useStorageAccess();
  const { moveCards, isMoving } = useMoveCardsToLocation();
  const selectedStoredCount = useStoredCardCount(
    collectionGuid,
    selectedIds,
    confirmOpen,
  );
  const exportedStoredCount = useStoredCardCount(
    collectionGuid,
    exportedScanIds,
    confirmDeleteExported || (storageLocked && !!exportedScanIds),
  );

  const handleExportSelected = useCallback(
    async (adapter: ExportAdapter) => {
      if (!collectionGuid) return;
      setExportingSelected(true);
      try {
        const selectedCards = await loadCardsForExport(collectionGuid, [
          ...selectedIds,
        ]);
        const slug = (viewedCollection?.name ?? "collection")
          .replace(/\s+/g, "-")
          .toLowerCase();
        runExport(
          adapter,
          selectedCards,
          slug,
          {
            isMtg: gameKey === "mtg",
            fieldDefinitions,
            gameKey,
            gameName: viewedCollection?.game?.name,
          },
          true,
        );
        const exportedIds = selectedCards.map((card) => card.scanId);
        markCardsDownloaded(exportedIds);
        if (!readOnly) setExportedScanIds(exportedIds);
      } catch (err) {
        console.error("Failed to export selected cards:", err);
        toast.error(t("cardGrid.exportSelectedFailed"));
      } finally {
        setExportingSelected(false);
      }
    },
    [
      collectionGuid,
      selectedIds,
      viewedCollection?.name,
      viewedCollection?.game?.name,
      readOnly,
      gameKey,
      fieldDefinitions,
      markCardsDownloaded,
      t,
    ],
  );

  const handleMoveExported = useCallback(
    (locationGuid: string) =>
      moveCards({
        guid: locationGuid,
        scanIds: exportedScanIds ?? [],
        collectionGuid,
      }),
    [moveCards, exportedScanIds, collectionGuid],
  );

  const handleDeleteExported = useCallback(() => {
    if (!exportedScanIds) return;
    removeCards(exportedScanIds);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of exportedScanIds) next.delete(id);
      return next;
    });
  }, [exportedScanIds, removeCards]);

  const handleBulkDelete = useCallback(() => {
    removeCards(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [removeCards, selectedIds]);

  const handleClearSession = useCallback(async () => {
    clearCards();
  }, [clearCards]);

  if (viewedCollection && (pagePending || summaryPending)) {
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

  if (!collectionsLoading && !viewedCollection) {
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

  const addCardDialog = viewedCollection && (
    <>
      <AddCardDialog
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        collectionGuid={viewedCollection.guid}
      />
      <ScanImageImportDialog
        open={importScansOpen}
        onOpenChange={setImportScansOpen}
        scanImageImport={scanImageImport}
      />
    </>
  );

  if (totalCount === 0) {
    return (
      <>
        <NoGameBanner />
        <EmptyState
          className="flex-1"
          title={t("cardGrid.noCardsScanned")}
          description={t("cardGrid.scanToGetStarted")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddCardOpen(true)}
              >
                <IconPlus />
                {t("addCard.button")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportScansOpen(true)}
              >
                <IconPhotoUp />
                {t("importScans.button")}
              </Button>
            </div>
          }
        />
        {addCardDialog}
      </>
    );
  }

  if (isGridReviewing) {
    return (
      <ReviewGrid
        cards={reviewGridCards}
        total={reviewGridPage.data?.totalCards ?? 0}
        isLoading={reviewGridPage.isPending}
        isError={reviewGridPage.isError}
        onOpenOneByOne={(card) => {
          setReviewLayout("single");
          setReviewTotal(reviewGridPage.data?.totalCards ?? null);
          setOpenScanId(card.scanId, { inReviewMode: true });
        }}
        onClose={() => setOpenScanId(null)}
        onCorrect={(card, correctedCard) =>
          correctCard(card.scanId, correctedCard)
        }
      />
    );
  }

  if (openScanId && !openEntry && openPositionPending) {
    return <CardDetailPanelSkeleton />;
  }

  if (openEntry) {
    const prevScanId = isReviewing
      ? reviewSession.previousScanId
      : (openPosition?.prevScanId ?? null);
    const nextScanId = isReviewing
      ? reviewSession.resolveNext(openPosition?.nextScanId)
      : (openPosition?.nextScanId ?? null);
    const detailPanel = (
      <CardDetailPanel
        scanId={openEntry.scanId}
        currentCard={openEntry.card}
        alternativeMatches={openEntry.alternativeMatches}
        lowConfidenceMatch={openEntry.lowConfidenceMatch}
        wasCorrected={openEntry.corrected}
        isReviewed={openEntry.reviewed}
        storageLocation={openEntry.storageLocation}
        isFoil={openEntry.isFoil}
        foilType={openEntry.foilType}
        condition={openEntry.condition}
        language={openEntry.language}
        binNumber={openEntry.binNumber}
        onClose={() => setOpenScanId(null)}
        onRemove={
          readOnly
            ? undefined
            : () => {
                removeCard(openEntry.scanId);
                if (isReviewing) reviewSession.forget(openEntry.scanId);
                setOpenScanId(isReviewing ? nextScanId : null, {
                  inReviewMode: isReviewing,
                });
              }
        }
        onPrev={() =>
          setOpenScanId(prevScanId, { inReviewMode: isReviewing })
        }
        onNext={() =>
          setOpenScanId(nextScanId, { inReviewMode: isReviewing })
        }
        hasPrev={!!prevScanId}
        hasNext={!!nextScanId}
        currentIndex={
          isReviewing ? reviewSession.index : (openPosition?.index ?? 0)
        }
        total={
          isReviewing
            ? Math.max(
                reviewTotal ?? openPosition?.total ?? 0,
                reviewSession.size,
              )
            : (openPosition?.total ?? 0)
        }
        copyIndex={openPosition?.copyIndex ?? -1}
        copyCount={openPosition?.copyCount ?? 1}
        reviewMode={isReviewing}
        onReviewComplete={() => finishReview(openPosition?.total ?? 0)}
        onShowReviewGrid={openReviewGrid}
      />
    );
    if (!readOnly) return detailPanel;
    return (
      <CardDetailScopeContext
        value={{ collection: viewedCollection, actions: viewedCardActions }}
      >
        {detailPanel}
      </CardDetailScopeContext>
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
          onStartReview={readOnly ? undefined : startReview}
          needsReviewCount={reviewCount?.totalCount ?? 0}
          onAddCard={() => setAddCardOpen(true)}
          onImportScans={() => setImportScansOpen(true)}
          collectionName={viewedCollection?.name}
          onClearAll={readOnly ? undefined : handleClearSession}
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
                condition: entry.condition,
                isDownloaded: entry.isDownloaded,
                hasAlternatives: !!entry.alternativeMatches?.length,
                lowConfidenceMatch: entry.lowConfidenceMatch,
                wasCorrected: entry.corrected,
                isReviewed: entry.reviewed,
                storageLocation: entry.storageLocation,
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
            {pagedCards.map((entry) => {
              const item = (
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
                  lowConfidenceMatch={entry.lowConfidenceMatch}
                  wasCorrected={entry.corrected}
                  isReviewed={entry.reviewed}
                  storageLocation={entry.storageLocation}
                  isFoil={entry.isFoil}
                  foilType={entry.foilType}
                  condition={entry.condition}
                  isDownloaded={entry.isDownloaded}
                  quantity={entry.quantity}
                />
              );
              if (readOnly) return item;
              return (
                <CardContextMenu
                  key={entry.scanId}
                  entry={entry}
                  isSelected={entry.scanIds.every((id) => selectedIds.has(id))}
                  onOpen={() => setOpenScanId(entry.scanId)}
                  onToggleSelect={() =>
                    handleSelect(entry.scanId, { shiftKey: false })
                  }
                >
                  {item}
                </CardContextMenu>
              );
            })}
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
            {!readOnly && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
                      />
                    }
                  >
                    <IconSparkles />
                    {t("cardContextMenu.foil")}
                    <IconChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="top">
                    <DropdownMenuItem
                      onClick={() =>
                        setCardsFoilType(Array.from(selectedIds), null)
                      }
                    >
                      {t("cardContextMenu.nonFoil")}
                    </DropdownMenuItem>
                    {foilOptions.map((option) => (
                      <DropdownMenuItem
                        key={option}
                        onClick={() =>
                          setCardsFoilType(Array.from(selectedIds), option)
                        }
                      >
                        {option}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="text-background hover:bg-background/15 hover:text-background dark:hover:bg-background/15"
                      />
                    }
                  >
                    <IconRosette />
                    {t("condition.setSelected")}
                    <IconChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="top">
                    {CARD_CONDITIONS.map((option) => (
                      <DropdownMenuItem
                        key={option}
                        onClick={() =>
                          setCardsCondition(Array.from(selectedIds), option)
                        }
                      >
                        {t(`condition.names.${option}`)}
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
              </>
            )}
          </div>
        </div>
      )}

      {addCardDialog}

      <SessionSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        collectionGuid={collectionGuid}
        elapsedMs={elapsedMs}
        sessionScanCount={sessionScanCount}
        collectionName={viewedCollection?.name ?? "collection"}
        onExported={(scanIds) => {
          markCardsDownloaded(scanIds);
          if (!readOnly && scanIds.length > 0) setExportedScanIds(scanIds);
        }}
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
      >
        <StorageDeleteWarning
          storedCount={selectedStoredCount}
          total={selectedIds.size}
          className="mt-4"
        />
      </DeleteDialog>

      <ExportedCardsDialog
        open={exportedScanIds != null && !storageLocked && !confirmDeleteExported}
        count={exportedCount}
        isMoving={isMoving}
        onOpenChange={(open) => {
          if (!open) setExportedScanIds(null);
        }}
        onMove={handleMoveExported}
        onDelete={() => setConfirmDeleteExported(true)}
      />

      <DeleteDialog
        open={
          exportedScanIds != null && (storageLocked || confirmDeleteExported)
        }
        onOpenChange={(open) => {
          if (open) return;
          setConfirmDeleteExported(false);
          setExportedScanIds(null);
        }}
        title={t("cardGrid.exportedDeleteTitle", { count: exportedCount })}
        description={t("cardGrid.exportedDeleteDescription", {
          count: exportedCount,
        })}
        confirm={exportedCount > 100 ? { type: "keyword" } : { type: "simple" }}
        confirmLabel={t("cardGrid.exportedDeleteConfirm", {
          count: exportedCount,
        })}
        cancelLabel={t("cardGrid.exportedKeep")}
        onConfirm={handleDeleteExported}
      >
        <StorageDeleteWarning
          storedCount={exportedStoredCount}
          total={exportedCount}
          className="mt-4"
        />
      </DeleteDialog>
    </>
  );
}
