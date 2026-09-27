import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useCardQueryState } from "@/features/cards/api/use-card-filter-sort";
import { CardToolbar } from "@/features/cards/components/card-toolbar";
import {
  monitorCardsKey,
  monitorCardsPageQueryOptions,
  monitorCardsSummaryQueryOptions,
} from "@/features/scanner/api/monitor-cards";
import { MonitorCardGrid } from "@/features/scanner/components/monitor-card-grid";
import { RecentScannedCards } from "@/features/scanner/components/recent-scanned-cards";
import { SessionErrorsPanel } from "@/features/scanner/components/session-errors-panel";
import { SessionStatsPanel } from "@/features/scanner/components/session-stats-panel";
import { UnmatchedCardsPanel } from "@/features/scanner/components/unmatched-cards-panel";
import { toDisplayStats } from "@/features/scanner/lib/compute-stats";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  CARD_GROUP_DUPLICATES_STORAGE_KEY,
  CARD_VIEW_MODE_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import {
  MONITOR_REFRESH_THROTTLE_MS,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants/timing";
import type { CardViewMode } from "@/lib/interfaces/cards";
import type { SessionMonitorViewProps } from "@/lib/interfaces/scanner";
import { IconCards } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function SessionMonitorView({
  session,
  cardsSource,
  header,
  toolbarLeading,
  binCount,
  showBinLocation,
}: SessionMonitorViewProps) {
  const { t } = useTranslation("scanner");
  const queryClient = useQueryClient();
  const { collection, recentCards, cardsVersion, unmatchedCards, errors, status } =
    session;
  const isMobile = useIsMobile();

  const fieldDefinitions = useMemo(
    () => collection?.game?.fieldDefinitions ?? [],
    [collection?.game?.fieldDefinitions],
  );
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    filters,
    setFilters,
    activeFilterCount,
  } = useCardQueryState(fieldDefinitions);

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

  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [cardsQuery, cardsSource.collectionGuid]);

  const { data: pageData, isPending: pagePending } = useQuery(
    monitorCardsPageQueryOptions(cardsSource, cardsQuery, page),
  );
  const { data: summary } = useQuery(
    monitorCardsSummaryQueryOptions(cardsSource, cardsQuery),
  );

  const lastRefreshRef = useRef(0);
  const cardsKey = useMemo(
    () => monitorCardsKey(cardsSource),
    [cardsSource],
  );
  useEffect(() => {
    if (cardsVersion === 0) return;
    const wait = Math.max(
      0,
      MONITOR_REFRESH_THROTTLE_MS - (Date.now() - lastRefreshRef.current),
    );
    const id = setTimeout(() => {
      lastRefreshRef.current = Date.now();
      void queryClient.invalidateQueries({ queryKey: cardsKey });
    }, wait);
    return () => clearTimeout(id);
  }, [cardsVersion, cardsKey, queryClient]);

  const entries = pageData?.items ?? [];
  const pageCount = pageData
    ? Math.max(1, Math.ceil(pageData.totalEntries / pageData.pageSize))
    : 1;
  const clampedPage = Math.min(page, pageCount - 1);
  useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
  }, [page, clampedPage]);

  const stats = useMemo(
    () => (summary ? toDisplayStats(summary.all, summary.filtered) : null),
    [summary],
  );
  const cardCount = summary?.all.totalCount ?? collection?.cardCount ?? 0;
  const matchingCount = pageData?.totalEntries ?? 0;
  const filteredCount = summary?.filtered.totalCount ?? 0;

  const toolbar = (
    <CardToolbar
      leading={toolbarLeading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sortKey={sortKey}
      onSortChange={setSortKey}
      sortableFields={sortableFields}
      hasCards={matchingCount > 0}
      activeFilters={filters}
      onFiltersChange={setFilters}
      activeFilterCount={activeFilterCount}
      availableRarities={stats?.rarities}
      availableColors={stats?.colors}
      binCount={binCount}
      cardCount={cardCount}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      groupDuplicates={groupDuplicates}
      onGroupDuplicatesChange={handleGroupDuplicatesChange}
    />
  );

  const grid = (
    <MonitorCardGrid
      entries={entries}
      status={status}
      cardCount={cardCount}
      matchingCount={matchingCount}
      isLoading={pagePending}
      isMobile={isMobile}
      viewMode={viewMode}
      groupDuplicates={groupDuplicates}
      page={clampedPage}
      pageCount={pageCount}
      onPageChange={setPage}
      showBinLocation={showBinLocation}
    />
  );

  if (isMobile) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {header}

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <SessionStatsPanel stats={stats} totalCards={filteredCount} />
          <RecentScannedCards cards={recentCards} />
          <UnmatchedCardsPanel cards={unmatchedCards} />
          <SessionErrorsPanel errors={errors} />
        </div>

        <Drawer>
          <DrawerTrigger className="flex items-center justify-center gap-2 mx-3 mb-3 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
            <IconCards className="size-4" />
            {cardCount > 0
              ? t("monitorPage.viewCards", { count: cardCount })
              : t("monitorPage.viewCardsEmpty")}
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">
              {t("monitorPage.scannedCardsTitle")}
            </DrawerTitle>
            <div className="flex flex-col overflow-hidden flex-1 min-h-0 pt-2">
              <div className="px-2 pb-2 border-b @container">{toolbar}</div>
              <div className="overflow-y-auto flex-1 @container">{grid}</div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <aside className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 2xl:col-span-2 overflow-hidden flex flex-col h-full p-2 border-r gap-2 bg-sidebar/70">
        {header}
        <SessionStatsPanel stats={stats} totalCards={filteredCount} />
        <UnmatchedCardsPanel cards={unmatchedCards} />
        <SessionErrorsPanel errors={errors} />
      </aside>

      <main className="col-span-7 md:col-span-7 lg:col-span-8 xl:col-span-9 2xl:col-span-10 overflow-y-auto h-full @container">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl p-2 border-b">
          {toolbar}
        </div>
        {grid}
      </main>
    </div>
  );
}
