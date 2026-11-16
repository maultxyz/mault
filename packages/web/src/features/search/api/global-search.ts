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
  CATALOG_SEARCH_LIMIT_PARAM,
  GLOBAL_SEARCH_OWNED_CARDS_PAGE_SIZE,
  OWNED_CARD_SEARCH_GAME_PARAM,
  OWNED_CARD_SEARCH_LIMIT_PARAM,
  OWNED_CARD_SEARCH_OFFSET_PARAM,
  catalogSearchGameKey,
  initialCatalogOffsetsByGame,
  nextCatalogOffsetsByGame,
  type CardPrintingsPage,
  type CatalogCardsSearchPage,
  type OwnedCardSearchPage,
  type CatalogCardSearchPage,
  type CatalogGame,
  type OwnedCardSearchResult,
  type PlayingCard,
  type Result,
} from "@magic-vault/shared";
import { infiniteQueryOptions, queryOptions, type QueryClient } from "@tanstack/react-query";

export const ownedCardSearchQueryOptions = (
  orgId: string | undefined,
  query: string,
  selectedGameKey: string | null,
  enabled: boolean,
) =>
  infiniteQueryOptions({
    queryKey: [OWNED_CARD_SEARCH_QUERY_KEY, orgId, query, selectedGameKey] as const,
    queryFn: async ({ pageParam }): Promise<OwnedCardSearchPage> => {
      const params = new URLSearchParams({
        q: query,
        [OWNED_CARD_SEARCH_LIMIT_PARAM]: String(GLOBAL_SEARCH_OWNED_CARDS_PAGE_SIZE + 1),
        [OWNED_CARD_SEARCH_OFFSET_PARAM]: String(pageParam),
      });
      if (selectedGameKey) params.set(OWNED_CARD_SEARCH_GAME_PARAM, selectedGameKey);
      const result = await apiGet<Result<OwnedCardSearchResult[]>>(`/api/collections/cards/search?${params}`);
      if (!result.success) throw new Error(result.message ?? "Search failed.");
      const rows = result.data ?? [];
      return {
        results: rows.slice(0, GLOBAL_SEARCH_OWNED_CARDS_PAGE_SIZE),
        nextOffset: rows.length > GLOBAL_SEARCH_OWNED_CARDS_PAGE_SIZE ? pageParam + GLOBAL_SEARCH_OWNED_CARDS_PAGE_SIZE : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: !!orgId && enabled,
  });

async function loadCatalogCardSearchPage(game: CatalogGame, query: string, offset: number): Promise<CatalogCardSearchPage> {
  const params = new URLSearchParams({
    q: query,
    gameKey: game.gameKey,
    lang: game.lang,
    [CATALOG_SEARCH_GROUP_BY_PARAM]: CATALOG_SEARCH_GROUP_BY_NAME,
    [CATALOG_SEARCH_LIMIT_PARAM]: String(CATALOG_RESULTS_PER_GAME),
  });
  if (offset > 0) params.set("offset", String(offset));
  const result = await apiGet<Result<CatalogCardSearchPage>>(`/api/cards/search?${params}`);
  if (!result.success || !result.data) throw new Error(result.message ?? "Search failed.");
  return result.data;
}

export const catalogCardsSearchQueryOptions = (games: CatalogGame[], query: string, enabled: boolean) =>
  infiniteQueryOptions({
    queryKey: [CATALOG_SEARCH_QUERY_KEY, games.map(catalogSearchGameKey), query] as const,
    queryFn: async ({ pageParam }): Promise<CatalogCardsSearchPage> => {
      const pages = await Promise.all(
        games.map(async (game) => {
          const offset = pageParam[catalogSearchGameKey(game)];
          return offset === undefined ? null : { game, page: await loadCatalogCardSearchPage(game, query, offset) };
        }),
      );
      const loadedPages = pages.filter((entry) => entry !== null);
      return {
        results: loadedPages.flatMap(({ game, page }) =>
          page.results.map(({ card, printingCount }) => ({ game, card, printingCount })),
        ),
        nextOffsetsByGame: nextCatalogOffsetsByGame(
          loadedPages.map(({ game, page }) => ({ gameKey: catalogSearchGameKey(game), nextOffset: page.nextOffset })),
        ),
      };
    },
    initialPageParam: initialCatalogOffsetsByGame(games),
    getNextPageParam: (lastPage) => lastPage.nextOffsetsByGame ?? undefined,
    enabled: enabled && games.length > 0,
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
