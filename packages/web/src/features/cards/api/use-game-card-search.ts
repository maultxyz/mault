import { searchGameCards } from "@/features/cards/api/card-search";
import type { GameCardSearchState } from "@/lib/interfaces/cards";
import { QUERY_MIN_LENGTH } from "@magic-vault/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useGameCardSearch(
  query: string,
  gameKey: string | null,
  lang: string,
): GameCardSearchState {
  const search = useInfiniteQuery({
    queryKey: ["game-card-search", query, gameKey, lang],
    queryFn: ({ pageParam }) =>
      searchGameCards(query, gameKey!, lang, pageParam).then(
        (r) => r.data ?? { cards: [], nextOffset: null },
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: !!gameKey && query.trim().length >= QUERY_MIN_LENGTH,
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
