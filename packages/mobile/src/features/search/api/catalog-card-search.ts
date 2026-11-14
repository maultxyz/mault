import { infiniteQueryOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  CATALOG_RESULTS_PER_GAME,
  CATALOG_SEARCH_GROUP_BY_NAME,
  CATALOG_SEARCH_GROUP_BY_PARAM,
  type CardPrintingsPage,
  type CatalogCardSearchPage,
  type CatalogGame,
  type PlayingCard,
  type Result,
} from "@magic-vault/shared";
import { getCardById } from "@/features/scanner/api/card-search";
import { apiGet, unwrap } from "@/lib/api/client";
import {
  CARD_PRINTINGS_QUERY_KEY,
  CATALOG_CARD_QUERY_KEY,
  CATALOG_SEARCH_QUERY_KEY,
  CATALOG_SEARCH_STALE_MS,
} from "@/lib/constants/search";

export const catalogCardSearchQueryOptions = (game: CatalogGame, query: string, enabled: boolean) =>
  queryOptions({
    queryKey: [CATALOG_SEARCH_QUERY_KEY, game.gameKey, game.lang, query] as const,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: query,
        gameKey: game.gameKey,
        lang: game.lang,
        [CATALOG_SEARCH_GROUP_BY_PARAM]: CATALOG_SEARCH_GROUP_BY_NAME,
      });
      const page = await unwrap(apiGet<Result<CatalogCardSearchPage>>(`/api/cards/search?${params}`));
      return page.results.slice(0, CATALOG_RESULTS_PER_GAME);
    },
    enabled,
    staleTime: CATALOG_SEARCH_STALE_MS,
  });

export const catalogCardQueryKey = (gameKey: string, id: string) => [CATALOG_CARD_QUERY_KEY, gameKey, id] as const;

export const catalogCardQueryOptions = (game: CatalogGame | null, id: string) =>
  queryOptions({
    queryKey: catalogCardQueryKey(game?.gameKey ?? "", id),
    queryFn: () => (game ? getCardById(id, game.collectionGuid, game.lang, game.gameKey) : Promise.resolve(null)),
    enabled: !!game && !!id,
    staleTime: CATALOG_SEARCH_STALE_MS,
  });

export function rememberCatalogCard(queryClient: QueryClient, gameKey: string, card: PlayingCard): void {
  queryClient.setQueryData(catalogCardQueryKey(gameKey, card.id), card);
}

export const cardPrintingsQueryOptions = (game: CatalogGame | null, cardId: string) =>
  infiniteQueryOptions({
    queryKey: [CARD_PRINTINGS_QUERY_KEY, game?.gameKey ?? "", game?.lang ?? "", cardId] as const,
    queryFn: async ({ pageParam }): Promise<CardPrintingsPage> => {
      if (!game) throw new Error("Unknown game.");
      const params = new URLSearchParams({ gameKey: game.gameKey, lang: game.lang, cardId });
      if (pageParam > 0) params.set("offset", String(pageParam));
      return unwrap(apiGet<Result<CardPrintingsPage>>(`/api/cards/printings?${params}`));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: !!game && !!cardId,
    staleTime: CATALOG_SEARCH_STALE_MS,
  });
