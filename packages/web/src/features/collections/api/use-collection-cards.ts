import {
  binCardCountsQueryOptions,
  collectionCardsSummaryQueryOptions,
} from "@/features/collections/api/collection-cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { toDisplayStats, toScanStats } from "@/features/scanner/lib/compute-stats";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import type { BinWindow, CollectionCardsQuery } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useCollectionCardsSummary(
  query: CollectionCardsQuery = ALL_CARDS_QUERY,
) {
  const { activeCollection } = useCollections();
  const { data: summary, isPending } = useQuery(
    collectionCardsSummaryQueryOptions(activeCollection?.guid, query),
  );

  const allStats = useMemo(
    () => (summary ? toScanStats(summary.all) : null),
    [summary],
  );
  const displayStats = useMemo(
    () => (summary ? toDisplayStats(summary.all, summary.filtered) : null),
    [summary],
  );

  return {
    summary,
    allStats,
    displayStats,
    totalCount: summary?.all.totalCount ?? 0,
    totalValue: summary?.all.totalValue ?? 0,
    isPending: !!activeCollection && isPending,
  };
}

export function useBinCardCounts(bins: BinWindow[]): Map<number, number> {
  const { activeCollection } = useCollections();
  const { data } = useQuery(
    binCardCountsQueryOptions(activeCollection?.guid, bins),
  );
  return useMemo(
    () => new Map((data ?? []).map((row) => [row.binNumber, row.count])),
    [data],
  );
}
