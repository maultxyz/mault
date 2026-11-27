import {
  binCardCountsQueryOptions,
  collectionCardsSummaryQueryOptions,
} from "@/features/collections/api/collection-cards";
import { useViewedCollection } from "@/features/collections/api/use-viewed-collection";
import { useSecondaryRequestsEnabled } from "@/lib/initial-load-context";
import {
  toDisplayStats,
  toScanStats,
} from "@/features/scanner/lib/compute-stats";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import type { CollectionCardsSummaryOptions } from "@/lib/interfaces/collections";
import type { BinCardCounts } from "@/lib/interfaces/scanner";
import type { BinWindow, CollectionCardsQuery } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useCollectionCardsSummary(
  query: CollectionCardsQuery = ALL_CARDS_QUERY,
  { isEnabled = true }: CollectionCardsSummaryOptions = {},
) {
  const { collection: activeCollection } = useViewedCollection();
  const gameKey = activeCollection?.game?.key;
  const areSecondaryRequestsEnabled = useSecondaryRequestsEnabled();
  const summaryQueryOptions = collectionCardsSummaryQueryOptions(
    activeCollection?.guid,
    query,
  );
  const {
    data: summary,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...summaryQueryOptions,
    enabled: isEnabled && !!activeCollection?.guid && areSecondaryRequestsEnabled,
  });

  const allStats = useMemo(
    () => (summary ? toScanStats(summary.all, gameKey) : null),
    [summary, gameKey],
  );
  const displayStats = useMemo(
    () => (summary ? toDisplayStats(summary.all, summary.filtered, gameKey) : null),
    [summary, gameKey],
  );

  return {
    summary,
    allStats,
    displayStats,
    totalCount: summary?.all.totalCount ?? 0,
    totalValue: summary?.all.totalValue ?? 0,
    isPending: !!activeCollection && isPending,
    isError,
    refetch: () => void refetch(),
  };
}

export function useBinCardCounts(bins: BinWindow[]): BinCardCounts {
  const { collection: activeCollection } = useViewedCollection();
  const areSecondaryRequestsEnabled = useSecondaryRequestsEnabled();
  const { data, dataUpdatedAt } = useQuery({
    ...binCardCountsQueryOptions(activeCollection?.guid, bins),
    enabled:
      !!activeCollection?.guid && bins.length > 0 && areSecondaryRequestsEnabled,
  });
  const counts = useMemo(
    () => new Map((data ?? []).map((row) => [row.binNumber, row.count])),
    [data],
  );
  const storageBatchStarts = useMemo(
    () =>
      new Map(
        (data ?? []).map((row) => [row.binNumber, row.storageBatchStarts ?? []]),
      ),
    [data],
  );
  return { counts, storageBatchStarts, updatedAt: dataUpdatedAt };
}
