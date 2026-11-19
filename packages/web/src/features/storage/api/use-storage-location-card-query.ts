import { useCardQueryState } from "@/features/cards/api/use-card-filter-sort";
import { toScanStats } from "@/features/scanner/lib/compute-stats";
import { storageLocationCardsSummaryQueryOptions } from "@/features/storage/api/storage-locations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { StorageLocationCardQueryState } from "@/lib/interfaces/storage";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { EMPTY_FIELD_DEFINITIONS } from "@/lib/constants/storage";
import { useCardFiltersSearchParams } from "@/hooks/use-card-filters-search-params";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useStorageLocationCardQuery(
  locationGuid: string | undefined,
): StorageLocationCardQueryState {
  const { data: summary } = useQuery(
    storageLocationCardsSummaryQueryOptions(locationGuid),
  );
  const urlFilters = useCardFiltersSearchParams();
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    filters,
    setFilters,
    activeFilterCount,
  } = useCardQueryState(
    summary?.sortableFields ?? EMPTY_FIELD_DEFINITIONS,
    urlFilters,
    { persistsSearchAndSortInUrl: true },
  );

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const cardsQuery = useMemo(
    () => ({
      search: debouncedSearch.toLowerCase().trim(),
      sort: sortKey,
      filters,
      grouped: false,
    }),
    [debouncedSearch, sortKey, filters],
  );
  const stats = useMemo(
    () => (summary ? toScanStats(summary.stats) : null),
    [summary],
  );

  return {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortableFields,
    filters,
    setFilters,
    activeFilterCount,
    cardsQuery,
    stats,
  };
}
