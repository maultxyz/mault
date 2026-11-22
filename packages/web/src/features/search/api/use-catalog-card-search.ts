import { catalogGameSearchQueryOptions } from "@/features/search/api/global-search";
import { catalogSearchGameKey, summarizeCatalogGameSearches, type CatalogGame } from "@magic-vault/shared";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useCatalogCardSearch(games: CatalogGame[], query: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const searchKey = [query, ...games.map(catalogSearchGameKey)].join("\n");
  const [paging, setPaging] = useState({ searchKey, shownPageCount: 1 });
  const shownPageCount = paging.searchKey === searchKey ? paging.shownPageCount : 1;
  const gameSearches = useQueries({
    queries: games.map((game) => catalogGameSearchQueryOptions(queryClient, game, query, shownPageCount, enabled)),
  });
  const summary = summarizeCatalogGameSearches(
    games.map((game, index) => {
      const gameSearch = gameSearches[index];
      return {
        game,
        data: gameSearch.data,
        isPending: gameSearch.isPending,
        isError: gameSearch.isError,
        isFetching: gameSearch.isFetching,
        isPlaceholderData: gameSearch.isPlaceholderData,
      };
    }),
  );

  const loadMore = () => {
    if (summary.loadMoreFailed) {
      for (const gameSearch of gameSearches) {
        if (gameSearch.data?.loadMoreFailed) void gameSearch.refetch();
      }
      return;
    }
    setPaging({ searchKey, shownPageCount: shownPageCount + 1 });
  };

  const retry = () => {
    for (const gameSearch of gameSearches) {
      if (gameSearch.isError) void gameSearch.refetch();
    }
  };

  return { ...summary, loadMore, retry };
}
