import { collectionCardsSummaryQueryOptions } from "@/features/collections/api/collection-cards";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { useQuery } from "@tanstack/react-query";

export function useCollectionCardCount(collectionGuid: string | undefined): number {
  const { data: summary } = useQuery(
    collectionCardsSummaryQueryOptions(collectionGuid, ALL_CARDS_QUERY),
  );
  return summary?.all.totalCount ?? 0;
}
