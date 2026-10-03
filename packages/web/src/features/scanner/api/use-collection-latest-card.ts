import {
  collectionCardsPageQueryOptions,
  collectionCardsSummaryQueryOptions,
} from "@/features/collections/api/collection-cards";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { useQuery } from "@tanstack/react-query";

export function useCollectionLatestCard(collectionGuid: string | undefined) {
  const { data: firstPage } = useQuery(
    collectionCardsPageQueryOptions(collectionGuid, ALL_CARDS_QUERY, 0),
  );
  const { data: summary } = useQuery(
    collectionCardsSummaryQueryOptions(collectionGuid, ALL_CARDS_QUERY),
  );
  return {
    latestCard: firstPage?.items[0]?.card,
    totalCount: summary?.all.totalCount ?? 0,
  };
}
