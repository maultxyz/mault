import { useCardQueryState } from "@/features/cards/api/use-card-filter-sort";
import {
  monitorCardsKey,
  monitorCardsPageQueryOptions,
  monitorCardsSummaryQueryOptions,
} from "@/features/scanner/api/monitor-cards";
import { toDisplayStats } from "@/features/scanner/lib/compute-stats";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  MONITOR_NEEDS_REVIEW_CARDS_QUERY,
  MONITOR_OPEN_CARD_PARAM,
} from "@/lib/constants/scanner";
import {
  CARD_GROUP_DUPLICATES_STORAGE_KEY,
  CARD_VIEW_MODE_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import {
  MONITOR_REFRESH_THROTTLE_MS,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants/timing";
import type { CardViewMode } from "@/lib/interfaces/cards";
import type {
  MonitorCardsSource,
  MonitorCardsState,
  SessionMonitorState,
} from "@/lib/interfaces/scanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useMonitorCards(
  session: SessionMonitorState,
  cardsSource: MonitorCardsSource,
  canEditCards: boolean,
): MonitorCardsState {
  const queryClient = useQueryClient();
  const { collection, cardsVersion } = session;

  const fieldDefinitions = useMemo(
    () => collection?.game?.fieldDefinitions ?? [],
    [collection?.game?.fieldDefinitions],
  );
  const queryState = useCardQueryState(fieldDefinitions);

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

  const debouncedSearch = useDebouncedValue(
    queryState.searchQuery,
    SEARCH_DEBOUNCE_MS,
  );
  const cardsQuery = useMemo(
    () => ({
      search: debouncedSearch.toLowerCase().trim(),
      sort: queryState.sortKey,
      filters: queryState.filters,
      grouped: groupDuplicates,
    }),
    [debouncedSearch, queryState.sortKey, queryState.filters, groupDuplicates],
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

  const { data: reviewSummary } = useQuery({
    ...monitorCardsSummaryQueryOptions(
      cardsSource,
      MONITOR_NEEDS_REVIEW_CARDS_QUERY,
    ),
    enabled: canEditCards && !!cardsSource.collectionGuid,
  });

  const lastRefreshRef = useRef(0);
  const cardsKey = useMemo(() => monitorCardsKey(cardsSource), [cardsSource]);
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

  const [searchParams, setSearchParams] = useSearchParams();
  const openScanId = canEditCards
    ? (searchParams.get(MONITOR_OPEN_CARD_PARAM) ?? undefined)
    : undefined;

  const setOpenScanId = useCallback(
    (scanId: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (scanId) next.set(MONITOR_OPEN_CARD_PARAM, scanId);
          else next.delete(MONITOR_OPEN_CARD_PARAM);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    ...queryState,
    cardsQuery,
    viewMode,
    setViewMode: handleViewModeChange,
    groupDuplicates,
    setGroupDuplicates: handleGroupDuplicatesChange,
    entries: pageData?.items ?? [],
    isLoading: pagePending,
    page: clampedPage,
    pageCount,
    setPage,
    stats,
    cardCount: summary?.all.totalCount ?? collection?.cardCount ?? 0,
    matchingCount: pageData?.totalEntries ?? 0,
    filteredCount: summary?.filtered.totalCount ?? 0,
    needsReviewCount: reviewSummary?.filtered.totalCount ?? 0,
    openScanId,
    setOpenScanId,
  };
}
