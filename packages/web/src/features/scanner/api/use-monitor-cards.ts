import { useCardQueryState } from "@/features/cards/api/use-card-filter-sort";
import { useCardViewPreferences } from "@/features/cards/api/use-card-view-preferences";
import {
  monitorCardsCountQueryOptions,
  monitorCardsKey,
  monitorCardsPageQueryOptions,
  monitorCardsSummaryQueryOptions,
} from "@/features/scanner/api/monitor-cards";
import { toScanStats } from "@/features/scanner/lib/compute-stats";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  MONITOR_NEEDS_REVIEW_CARDS_QUERY,
  MONITOR_OPEN_CARD_PARAM,
} from "@/lib/constants/scanner";
import {
  CARDS_SUMMARY_REFRESH_THROTTLE_MS,
  MONITOR_REFRESH_THROTTLE_MS,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants/timing";
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

  const {
    viewMode,
    handleViewModeChange,
    groupDuplicates,
    handleGroupDuplicatesChange,
  } = useCardViewPreferences();

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
    monitorCardsSummaryQueryOptions(cardsSource, ALL_CARDS_QUERY),
  );

  const { data: reviewCount } = useQuery({
    ...monitorCardsCountQueryOptions(
      cardsSource,
      MONITOR_NEEDS_REVIEW_CARDS_QUERY,
    ),
    enabled: canEditCards && !!cardsSource.collectionGuid,
  });

  const lastRefreshRef = useRef(0);
  const lastSummaryRefreshRef = useRef(0);
  const cardsKey = useMemo(() => monitorCardsKey(cardsSource), [cardsSource]);
  useEffect(() => {
    if (cardsVersion === 0) return;
    const scheduleRefresh = (
      lastRefreshAt: { current: number },
      throttleMs: number,
      refreshSummary: boolean,
    ) =>
      setTimeout(
        () => {
          lastRefreshAt.current = Date.now();
          void queryClient.invalidateQueries({
            queryKey: cardsKey,
            predicate: (query) =>
              (query.queryKey[2] === "summary") === refreshSummary,
          });
        },
        Math.max(0, throttleMs - (Date.now() - lastRefreshAt.current)),
      );
    const timers = [
      scheduleRefresh(lastRefreshRef, MONITOR_REFRESH_THROTTLE_MS, false),
      scheduleRefresh(
        lastSummaryRefreshRef,
        CARDS_SUMMARY_REFRESH_THROTTLE_MS,
        true,
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [cardsVersion, cardsKey, queryClient]);

  const pageCount = pageData
    ? Math.max(1, Math.ceil(pageData.totalEntries / pageData.pageSize))
    : 1;
  const clampedPage = Math.min(page, pageCount - 1);
  useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
  }, [page, clampedPage]);

  const stats = useMemo(
    () => (summary ? toScanStats(summary.all) : null),
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
    needsReviewCount: reviewCount?.totalCount ?? 0,
    openScanId,
    setOpenScanId,
  };
}
