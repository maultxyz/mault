import { gameCardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { searchGameCards } from "@/features/cards/api/card-search";
import type { CardSearchState } from "@/lib/interfaces/cards";
import { QUERY_MIN_LENGTH } from "@magic-vault/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useGameCardSearch(
  query: string,
  gameKey: string | null,
  lang: string,
  setCode?: string,
): CardSearchState {
  const enabled = !!gameKey && query.trim().length >= QUERY_MIN_LENGTH;
  const search = useInfiniteQuery({
    queryKey: ["game-card-search", query, gameKey, lang, setCode ?? null],
    queryFn: ({ pageParam }) =>
      searchGameCards(query, gameKey!, lang, pageParam, setCode).then(
        (r) => r.data ?? { cards: [], nextOffset: null },
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled,
    staleTime: 60_000,
  });
  const setsQuery = useQuery({
    ...gameCardSetsQueryOptions(gameKey, query, lang),
    enabled,
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
