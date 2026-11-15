import { getCardById } from "@/features/cards/api/card-search";
import { apiGet } from "@/lib/api/client";
import {
  CARD_PRINTINGS_QUERY_KEY,
  CATALOG_CARD_QUERY_KEY,
  CATALOG_SEARCH_QUERY_KEY,
  CATALOG_SEARCH_STALE_MS,
  OWNED_CARD_SEARCH_QUERY_KEY,
} from "@/lib/constants/search";
import {
  CATALOG_RESULTS_PER_GAME,
  CATALOG_SEARCH_GROUP_BY_NAME,
  CATALOG_SEARCH_GROUP_BY_PARAM,
  type CardPrintingsPage,
  type CatalogCardSearchPage,
  type CatalogCardSearchResult,
  type CatalogGame,
  type OwnedCardSearchResult,
  type PlayingCard,
  type Result,
} from "@magic-vault/shared";
import { infiniteQueryOptions, queryOptions, type QueryClient } from "@tanstack/react-query";

export const ownedCardSearchQueryOptions = (orgId: string | undefined, query: string, enabled: boolean) =>
  queryOptions({
    queryKey: [OWNED_CARD_SEARCH_QUERY_KEY, orgId, query] as const,
    queryFn: async (): Promise<OwnedCardSearchResult[]> => {
      const result = await apiGet<Result<OwnedCardSearchResult[]>>(
        `/api/collections/cards/search?${new URLSearchParams({ q: query })}`,
      );
      if (!result.success) throw new Error(result.message ?? "Search failed.");
      return result.data ?? [];
    },
    enabled: !!orgId && enabled,
  });

export const catalogCardSearchQueryOptions = (game: CatalogGame, query: string, enabled: boolean) =>
  queryOptions({
    queryKey: [CATALOG_SEARCH_QUERY_KEY, game.gameKey, game.lang, query] as const,
    queryFn: async (): Promise<CatalogCardSearchResult[]> => {
      const params = new URLSearchParams({
        q: query,
        gameKey: game.gameKey,
        lang: game.lang,
        [CATALOG_SEARCH_GROUP_BY_PARAM]: CATALOG_SEARCH_GROUP_BY_NAME,
      });
      const result = await apiGet<Result<CatalogCardSearchPage>>(`/api/cards/search?${params}`);
      if (!result.success || !result.data) throw new Error(result.message ?? "Search failed.");
      return result.data.results.slice(0, CATALOG_RESULTS_PER_GAME);
    },
    enabled,
    staleTime: CATALOG_SEARCH_STALE_MS,
  });

export const catalogCardQueryKey = (gameKey: string, cardId: string) =>
  [CATALOG_CARD_QUERY_KEY, gameKey, cardId] as const;

export const catalogCardQueryOptions = (game: CatalogGame | null, cardId: string) =>
  queryOptions({
    queryKey: catalogCardQueryKey(game?.gameKey ?? "", cardId),
    queryFn: async (): Promise<PlayingCard> => {
      if (!game) throw new Error("Unknown game.");
      const result = await getCardById(cardId, game.collectionGuid, game.lang, game.gameKey);
      if (!result.success || !result.data) throw new Error(result.message ?? "Card not found.");
      return result.data;
    },
    enabled: !!game && !!cardId,
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
      const result = await apiGet<Result<CardPrintingsPage>>(`/api/cards/printings?${params}`);
      if (!result.success || !result.data) throw new Error(result.message ?? "Couldn't load printings.");
      return result.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: !!game && !!cardId,
    staleTime: CATALOG_SEARCH_STALE_MS,
  });
