import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { searchCards } from "@/features/cards/api/card-search";
import type {
  CardSearchOptions,
  CardSearchState,
} from "@/lib/interfaces/cards";
import { QUERY_MIN_LENGTH } from "@magic-vault/shared";
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";

export const cardSearchQueryOptions = (
  query: string,
  collectionGuid: string | undefined,
  setCode?: string,
  language?: string,
) =>
  infiniteQueryOptions({
    queryKey: [
      "card-search",
      query,
      collectionGuid,
      setCode ?? null,
      language ?? null,
    ],
    queryFn: ({ pageParam }) =>
      searchCards(query, collectionGuid, pageParam, setCode, language).then(
        (r) => r.data ?? { cards: [], nextOffset: null },
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    staleTime: 60_000,
  });

export function useCardSearch(
  query: string,
  collectionGuid: string | undefined,
  setCode?: string,
  language?: string,
  { keepResultsWhileRefreshing = false }: CardSearchOptions = {},
): CardSearchState {
  const enabled = query.trim().length >= QUERY_MIN_LENGTH;
  const search = useInfiniteQuery({
    ...cardSearchQueryOptions(query, collectionGuid, setCode, language),
    enabled,
  });
  const setsQuery = useQuery({
    ...cardSetsQueryOptions(collectionGuid, query, language),
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
    loading: keepResultsWhileRefreshing
      ? search.isLoading
      : search.isFetching && !search.isFetchingNextPage,
    hasMore: search.hasNextPage,
    isLoadingMore: search.isFetchingNextPage,
    loadMore: () => void search.fetchNextPage(),
  };
}
