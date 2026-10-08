import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { searchCards } from "@/features/cards/api/card-search";
import type { CardSearchState } from "@/lib/interfaces/cards";
import { QUERY_MIN_LENGTH } from "@magic-vault/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useCardSearch(
  query: string,
  collectionGuid: string | undefined,
  setCode?: string,
): CardSearchState {
  const enabled = query.trim().length >= QUERY_MIN_LENGTH;
  const search = useInfiniteQuery({
    queryKey: ["card-search", query, collectionGuid, setCode ?? null],
    queryFn: ({ pageParam }) =>
      searchCards(query, collectionGuid, pageParam, setCode).then(
        (r) => r.data ?? { cards: [], nextOffset: null },
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled,
    staleTime: 60_000,
  });
  const setsQuery = useQuery({
    ...cardSetsQueryOptions(collectionGuid, query),
    enabled: enabled && !!collectionGuid,
  });

  const results = useMemo(
    () => search.data?.pages.flatMap((page) => page.cards) ?? [],
    [search.data],
  );
  const sets = useMemo(() => setsQuery.data ?? [], [setsQuery.data]);
  const totalCount = useMemo(
    () => sets.reduce((sum, set) => sum + set.cardCount, 0),
    [sets],
  );

  return {
    results,
    sets,
    totalCount,
    loading: search.isFetching && !search.isFetchingNextPage,
    hasMore: search.hasNextPage,
    isLoadingMore: search.isFetchingNextPage,
    loadMore: () => void search.fetchNextPage(),
  };
}
