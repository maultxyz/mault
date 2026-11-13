import { CardContextMenu } from "@/features/cards/components/card-context-menu";
import { useHiddenDownloadedCount } from "@/features/cards/api/use-hidden-downloaded-count";
import { DeleteDialog } from "@/components/delete-dialog";
import { SelectionActionBar } from "@/components/selection-action-bar";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { PendingScanCardItem } from "@/features/cards/components/pending-scan-card-item";
import { usePendingScanCards } from "@/features/cards/api/use-pending-scan-cards";
import { useDocumentScan } from "@/features/scanner/api/use-document-scan";
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
import { useMoveCardsToCollection } from "@/features/collections/api/use-move-cards-to-collection";
import { useMoveTargetCollections } from "@/features/collections/api/use-move-target-collections";
import { MoveToLocationDialog } from "@/features/storage/components/move-to-location-dialog";
import {
  allExportAdapters,
  downloadCollectionCsv,
  supportsGame,
  type ExportAdapter,
} from "@/features/cards/lib/export";
import {
  collectionCardPositionQueryOptions,
  collectionCardsPageQueryOptions,
  collectionCardsCountQueryOptions,
  loadCollectionCardIds,
  scanTimelineBucketsQueryOptions,
  scanTimelineCardsQueryOptions,
} from "@/features/collections/api/collection-cards";
import { CardScanTimeline } from "@/features/cards/components/card-scan-timeline";
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
import { useElementHeight } from "@/hooks/use-element-height";
import { BULK_TAG_ACTIONS } from "@/lib/constants/card-tags";
import {
  CARD_GRID_CLASS,
  CARD_GRID_DENSITY_CLASS,
  SELECTION_ACTION_BAR_BUTTON_CLASS,
  SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS,
} from "@/lib/constants/card-grid";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { OpenScanOptions } from "@/lib/interfaces/cards";
import {
  IconAlbum,
  IconBox,
  IconChevronDown,
  IconDownload,
  IconLoader2,
  IconPhotoUp,
  IconPlus,
  IconRosette,
  IconSparkles,
  IconTag,
} from "@tabler/icons-react";
import {
  CARD_CONDITIONS,
  CARD_TAGS,
  computeBinCount,
  deviceTimeZone,
  groupCardsByScanTime,
  toReviewGridCard,
  type GroupedScannedCard,
  type ScanTimelineBlock,
} from "@magic-vault/shared";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { setPageSize, usePageSize } from "@/lib/page-size-store";
import { useTranslation } from "react-i18next";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useScanSelection } from "@/hooks/use-scan-selection";
import {
  groupedCardKey,
  groupedCardScanIds,
} from "@/features/cards/lib/grouped-card-selection";
import { useReviewSession } from "@/hooks/use-review-session";
import { useReviewQueueSession } from "@/features/cards/api/use-review-queue";
import { reviewQueueStore } from "@/features/cards/lib/review-queue-store";
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
    setCardsTags,
    setCardsFoilType,
    elapsedMs,
    sessionScanCount,
  } = useScannedCards();
  const collectionGuid = viewedCollection?.guid;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [importScansOpen, setImportScansOpen] = useState(false);
  const scanImageImport = useScanImageImport(collectionGuid);
  const documentScan = useDocumentScan(
    scanImageImport,
    collectionGuid,
    importScansOpen,
  );
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
  const pageSize = usePageSize();
  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(0);
  };
  const {
    viewMode,
    handleViewModeChange,
    groupDuplicates,
    handleGroupDuplicatesChange,
    scanTimeline,
    handleScanTimelineChange,
  } = useCardViewPreferences();
  const scanTimelineGrouping = scanTimeline === "off" ? null : scanTimeline;
  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(
    null,
  );
  const toolbarHeight = useElementHeight(toolbarElement);
  const [density, handleDensityChange] = useCardGridDensity();

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const cardsQuery = useMemo(
    () => ({
      search: debouncedSearch.toLowerCase().trim(),
      sort: scanTimelineGrouping ? null : sortKey,
      filters,
      grouped: scanTimelineGrouping ? false : groupDuplicates,
    }),
    [debouncedSearch, sortKey, filters, groupDuplicates, scanTimelineGrouping],
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
  const reviewQueueSession = useReviewQueueSession();
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

  const isOneByOneReviewing =
    !readOnly && isReviewing && !!openScanId && !!collectionGuid;
  useEffect(() => {
    if (!isOneByOneReviewing) {
      reviewQueueStore.stop();
      return;
    }
    if (reviewQueueSession?.collectionGuid !== collectionGuid) {
      reviewQueueStore.start(collectionGuid!, reviewGridQuery);
    }
    reviewQueueStore.setCurrent(openScanId!);
  }, [
    isOneByOneReviewing,
    reviewQueueSession?.collectionGuid,
    collectionGuid,
    reviewGridQuery,
    openScanId,
  ]);
  useEffect(() => () => reviewQueueStore.stop(), []);

  const pageQuery = useQuery({
    ...collectionCardsPageQueryOptions(
      collectionGuid,
      cardsQuery,
      page,
      pageSize,
    ),
    enabled: !!collectionGuid && !scanTimelineGrouping,
  });
  const scanTimelineTimeZone = useMemo(() => deviceTimeZone(), []);
  const scanTimelineCardsQuery = useInfiniteQuery({
    ...scanTimelineCardsQueryOptions(collectionGuid, cardsQuery),
    enabled: !!collectionGuid && !!scanTimelineGrouping,
  });
  const scanTimelineBucketsQuery = useQuery({
    ...scanTimelineBucketsQueryOptions(
      collectionGuid,
      cardsQuery,
      scanTimelineGrouping ?? "day",
      scanTimelineTimeZone,
    ),
    enabled: !!collectionGuid && !!scanTimelineGrouping,
  });
  const scanTimelinePages = scanTimelineCardsQuery.data?.pages;
  const pageData = scanTimelineGrouping
    ? scanTimelinePages?.[0]
    : pageQuery.data;
  const pagePending = scanTimelineGrouping
    ? scanTimelineCardsQuery.isPending
    : pageQuery.isPending;
  const cardListUpdatedAt = scanTimelineGrouping
    ? scanTimelineCardsQuery.dataUpdatedAt
    : pageQuery.dataUpdatedAt;
  const pagedCards = useMemo(
    () =>
      scanTimelineGrouping
        ? (scanTimelinePages ?? []).flatMap((timelinePage) => timelinePage.items)
        : (pageQuery.data?.items ?? []),
    [scanTimelineGrouping, scanTimelinePages, pageQuery.data],
  );
  const {
    selectedIds,
    setSelectedIds,
    toggleIds: toggleSelect,
    selectItem: handleSelect,
    togglePage: togglePageSelect,
    isItemSelected,
    clearSelection,
  } = useScanSelection({
    pageItems: pagedCards,
    keyOf: groupedCardKey,
    scanIdsOf: groupedCardScanIds,
  });
  const scanTimelineBlocks = useMemo(
    () =>
      scanTimelineGrouping
        ? groupCardsByScanTime(
            pagedCards,
            scanTimelineGrouping,
            scanTimelineBucketsQuery.data?.buckets,
          )
        : [],
    [scanTimelineGrouping, pagedCards, scanTimelineBucketsQuery.data],
  );
  const { fetchNextPage: fetchNextScanTimelinePage } = scanTimelineCardsQuery;
  const loadMoreScanTimelineCards = useCallback(() => {
    void fetchNextScanTimelinePage();
  }, [fetchNextScanTimelinePage]);
  const totalCards = pageData?.totalCards ?? 0;
  const hiddenDownloadedCount = useHiddenDownloadedCount(
    cardsQuery,
    !!pageData && totalCards === 0,
  );
  const pageCount = pageData
    ? Math.max(1, Math.ceil(pageData.totalEntries / pageData.pageSize))
    : 1;
  const clampedPage = Math.min(page, pageCount - 1);
  const firstEntryIndex = clampedPage * (pageData?.pageSize ?? 0);
  const entryRange = {
    from: firstEntryIndex + 1,
    to: firstEntryIndex + pagedCards.length,
    total: pageData?.totalEntries ?? 0,
  };

  const pendingScanCards = usePendingScanCards(
    collectionGuid,
    cardListUpdatedAt,
  );
  const visiblePendingScanCards =
    viewMode === "grid" && clampedPage === 0 && !scanTimelineGrouping
      ? pendingScanCards
      : [];

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
        isReviewing,
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
    isReviewing,
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
      selectedIds.size > 0 ? clearSelection : undefined,
  });

  const toggleScanTimelineBlockSelect = useCallback(
    (block: ScanTimelineBlock<GroupedScannedCard>) =>
      toggleSelect(block.cards.flatMap((entry) => entry.scanIds)),
    [toggleSelect],
  );

  const allSelected =
    totalCards > 0 &&
    selectedIds.size >= totalCards &&
    pagedCards.every(isItemSelected);

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
  }, [allSelected, collectionGuid, cardsQuery, setSelectedIds]);

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
  const moveTargetCollections = useMoveTargetCollections(collectionGuid);
  const { moveToCollection, isMovingToCollection } =
    useMoveCardsToCollection(collectionGuid);
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
        const exportedIds = [...selectedIds];
        await downloadCollectionCsv(
          collectionGuid,
          adapter,
          viewedCollection?.name ?? "collection",
          { scanIds: exportedIds, combineDuplicates: true },
        );
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
      readOnly,
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

  const [moveSelectedOpen, setMoveSelectedOpen] = useState(false);
  const handleMoveSelected = useCallback(
    (locationGuid: string) =>
      moveCards({
        guid: locationGuid,
        scanIds: Array.from(selectedIds),
        collectionGuid,
      }),
    [moveCards, selectedIds, collectionGuid],
  );
  const handleMoveSelectedToCollection = useCallback(
    async (targetCollectionGuid: string) => {
      const moved = await moveToCollection(
        Array.from(selectedIds),
        targetCollectionGuid,
      );
      if (moved) setSelectedIds(new Set());
      return moved;
    },
    [moveToCollection, selectedIds, setSelectedIds],
  );

  const handleDeleteExported = useCallback(() => {
    if (!exportedScanIds) return;
    removeCards(exportedScanIds);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of exportedScanIds) next.delete(id);
      return next;
    });
  }, [exportedScanIds, removeCards, setSelectedIds]);

  const handleBulkDelete = useCallback(() => {
    removeCards(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [removeCards, selectedIds, setSelectedIds]);

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
        documentScan={documentScan}
      />
    </>
  );

  if (totalCount === 0 && visiblePendingScanCards.length === 0) {
    return (
      <>
        <NoGameBanner />
        <EmptyState
          className="flex-1"
          title={t("cardGrid.noCardsScanned")}
          description={t("cardGrid.scanToGetStarted")}
          action={
            <div className="flex flex-wrap justify-center gap-1.5">
              <Button
                variant="outline"
                onClick={() => setAddCardOpen(true)}
              >
                <IconPlus />
                {t("addCard.button")}
              </Button>
              <Button
                variant="outline"
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
        isDownloaded={openEntry.isDownloaded}
        storageLocation={openEntry.storageLocation}
        isFoil={openEntry.isFoil}
        foilType={openEntry.foilType}
        stamp={openEntry.stamp}
        condition={openEntry.condition}
        language={openEntry.language}
        binNumber={openEntry.binNumber}
        onClose={() => setOpenScanId(null)}
        onRemove={
          readOnly
            ? undefined
            : () => {
                removeCard(openEntry.scanId);
                if (isReviewing) {
                  reviewSession.forget(openEntry.scanId);
                  reviewQueueStore.markRemoved(openEntry.scanId);
                }
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
        onReviewed={reviewQueueStore.markReviewed}
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

  const toCardTableRow = (entry: GroupedScannedCard) => ({
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
    isSelected: isItemSelected(entry),
  });

  const renderCardGridItem = (entry: GroupedScannedCard) => {
    const item = (
      <ScannedCardItem
        key={entry.scanId}
        card={entry.card}
        scannedAt={entry.scannedAt}
        onOpen={() => setOpenScanId(entry.scanId)}
        binNumber={entry.binNumber}
        isSelected={isItemSelected(entry)}
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
        isSelected={isItemSelected(entry)}
        onOpen={() => setOpenScanId(entry.scanId)}
        onToggleSelect={() =>
          handleSelect(entry.scanId, { shiftKey: false })
        }
      >
        {item}
      </CardContextMenu>
    );
  };

  const renderCardList = (entries: GroupedScannedCard[]) => (
    <div className="rounded-lg border">
      <ScannedCardTable
        rows={entries.map(toCardTableRow)}
        showQuantity={groupDuplicates && !scanTimelineGrouping}
        onOpen={(row) => setOpenScanId(row.scanId)}
        onToggleSelect={(row, options) => handleSelect(row.scanId, options)}
        onTogglePageSelect={
          scanTimelineGrouping
            ? () => toggleSelect(entries.flatMap((entry) => entry.scanIds))
            : togglePageSelect
        }
      />
    </div>
  );

  return (
    <>
      <NoGameBanner />
      <div
        ref={setToolbarElement}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl p-2 border-b"
      >
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
          scanTimeline={scanTimeline}
          onScanTimelineChange={handleScanTimelineChange}
        />
      </div>
      {totalCards === 0 && visiblePendingScanCards.length === 0 && (
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
                onClick={() => setFilters({ ...filters, hideDownloaded: false })}
              >
                <IconDownload />
                {t("cardFilterPopover.showDownloadedCards")}
              </Button>
            ) : undefined
          }
        />
      )}
      <div className="p-2 flex-1">
        {scanTimelineGrouping ? (
          <CardScanTimeline
            blocks={scanTimelineBlocks}
            grouping={scanTimelineGrouping}
            loadedCardCount={pagedCards.length}
            totalCardCount={pageData?.totalEntries ?? 0}
            hasMoreCards={scanTimelineCardsQuery.hasNextPage}
            isLoadingMoreCards={scanTimelineCardsQuery.isFetchingNextPage}
            onLoadMoreCards={loadMoreScanTimelineCards}
            selectedScanIds={selectedIds}
            stickyHeaderTopOffset={toolbarHeight}
            onToggleBlockSelect={toggleScanTimelineBlockSelect}
            renderBlockCards={(timelineBlock) =>
              viewMode === "list" ? (
                renderCardList(timelineBlock.cards)
              ) : (
                <div className={CARD_GRID_DENSITY_CLASS[density]}>
                  {timelineBlock.cards.map(renderCardGridItem)}
                </div>
              )
            }
          />
        ) : (
          <>
            <ListPagination
              alignsEnd
              className="pb-2"
              pagination={{
                page: clampedPage + 1,
                pageCount,
                setPage: (nextPage) => setPage(nextPage - 1),
                ...entryRange,
              }}
              pageSize={pageSize}
              onPageSizeChange={changePageSize}
            />
            {viewMode === "list" ? (
              renderCardList(pagedCards)
            ) : (
              <div className={CARD_GRID_DENSITY_CLASS[density]}>
                {visiblePendingScanCards.map((pendingScanCard) => (
                  <PendingScanCardItem
                    key={`pending-${pendingScanCard.scanId}`}
                    card={pendingScanCard.card}
                  />
                ))}
                {pagedCards.map(renderCardGridItem)}
              </div>
            )}
            <ListPagination
              alignsEnd
              className="pt-4"
              pagination={{
                page: clampedPage + 1,
                pageCount,
                setPage: (nextPage) => setPage(nextPage - 1),
                ...entryRange,
              }}
              pageSize={pageSize}
              onPageSizeChange={changePageSize}
            />
          </>
        )}
      </div>

      {selectedIds.size > 0 && (
        <SelectionActionBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  disabled={exportingSelected || exportAdapters.length === 0}
                  className={SELECTION_ACTION_BAR_BUTTON_CLASS}
                />
              }
            >
              {exportingSelected ? (
                <IconLoader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <IconDownload />
              )}
              {exportingSelected ? t("cardGrid.exporting") : t("cardGrid.export")}
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
                      className={SELECTION_ACTION_BAR_BUTTON_CLASS}
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
                      className={SELECTION_ACTION_BAR_BUTTON_CLASS}
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
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      className={SELECTION_ACTION_BAR_BUTTON_CLASS}
                    />
                  }
                >
                  <IconTag />
                  {t("cardTags.title")}
                  <IconChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top">
                  {BULK_TAG_ACTIONS.map(({ enabled, labelKey }, index) => (
                    <DropdownMenuGroup key={labelKey}>
                      {index > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel>{t(labelKey)}</DropdownMenuLabel>
                      {CARD_TAGS.map((tag) => (
                        <DropdownMenuItem
                          key={tag}
                          onClick={() =>
                            setCardsTags(Array.from(selectedIds), [tag], enabled)
                          }
                        >
                          {t(`cardTags.names.${tag}`)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {(!storageLocked || moveTargetCollections.length > 0) && (
                <Button
                  variant="ghost"
                  disabled={isMoving || isMovingToCollection}
                  className={SELECTION_ACTION_BAR_BUTTON_CLASS}
                  onClick={() => setMoveSelectedOpen(true)}
                >
                  <IconBox />
                  {t("cardGrid.moveToLocation")}
                </Button>
              )}
              <Button
                variant="destructive"
                className={SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS}
                onClick={() => setConfirmOpen(true)}
              >
                {t("cardGrid.delete")}
              </Button>
            </>
          )}
        </SelectionActionBar>
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

      <MoveToLocationDialog
        open={moveSelectedOpen}
        count={selectedIds.size}
        isMoving={isMoving || isMovingToCollection}
        showLocations={!storageLocked}
        sourceCollectionGuid={collectionGuid}
        onOpenChange={setMoveSelectedOpen}
        onMove={handleMoveSelected}
        onMoveToCollection={handleMoveSelectedToCollection}
      />

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
