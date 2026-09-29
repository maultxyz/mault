import { searchCards } from "@/features/cards/api/card-search";
import type { CardSearchState } from "@/lib/interfaces/cards";
import { QUERY_MIN_LENGTH } from "@magic-vault/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useCardSearch(
  query: string,
  collectionGuid: string | undefined,
): CardSearchState {
  const search = useInfiniteQuery({
    queryKey: ["card-search", query, collectionGuid],
    queryFn: ({ pageParam }) =>
      searchCards(query, collectionGuid, pageParam).then(
        (r) => r.data ?? { cards: [], nextOffset: null },
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: query.trim().length >= QUERY_MIN_LENGTH,
    staleTime: 60_000,
  });

  const results = useMemo(
    () => search.data?.pages.flatMap((page) => page.cards) ?? [],
    [search.data],
  );

  return {
    results,
    loading: search.isFetching && !search.isFetchingNextPage,
    hasMore: search.hasNextPage,
    isLoadingMore: search.isFetchingNextPage,
    loadMore: () => void search.fetchNextPage(),
  };
}
