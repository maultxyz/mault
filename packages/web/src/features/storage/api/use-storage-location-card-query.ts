import { useCardQueryState } from "@/features/cards/api/use-card-filter-sort";
import { toScanStats } from "@/features/scanner/lib/compute-stats";
import { storageLocationCardsSummaryQueryOptions } from "@/features/storage/api/storage-locations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { StorageLocationCardQueryState } from "@/lib/interfaces/storage";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { EMPTY_FIELD_DEFINITIONS } from "@/lib/constants/storage";
import { DEFAULT_CARD_SORT, EMPTY_CARD_FILTERS } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export function useStorageLocationCardQuery(
  locationGuid: string | undefined,
): StorageLocationCardQueryState {
  const { data: summary } = useQuery(
    storageLocationCardsSummaryQueryOptions(locationGuid),
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
  } = useCardQueryState(summary?.sortableFields ?? EMPTY_FIELD_DEFINITIONS);
  const [queriedLocationGuid, setQueriedLocationGuid] = useState(locationGuid);
  if (queriedLocationGuid !== locationGuid) {
    setQueriedLocationGuid(locationGuid);
    setSearchQuery("");
    setSortKey(DEFAULT_CARD_SORT);
    setFilters(EMPTY_CARD_FILTERS);
  }

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
