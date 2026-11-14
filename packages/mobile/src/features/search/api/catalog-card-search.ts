import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { CardSearchPage, PlayingCard, Result } from "@magic-vault/shared";
import { getCardById } from "@/features/scanner/api/card-search";
import { apiGet, unwrap } from "@/lib/api/client";
import {
  CATALOG_CARD_QUERY_KEY,
  CATALOG_RESULTS_PER_GAME,
  CATALOG_SEARCH_QUERY_KEY,
  CATALOG_SEARCH_STALE_MS,
} from "@/lib/constants/search";
import type { CatalogGame } from "@/lib/interfaces/search";

export const catalogCardSearchQueryOptions = (game: CatalogGame, query: string, enabled: boolean) =>
  queryOptions({
    queryKey: [CATALOG_SEARCH_QUERY_KEY, game.gameKey, game.lang, query] as const,
    queryFn: async () => {
      const params = new URLSearchParams({ q: query, gameKey: game.gameKey, lang: game.lang });
      const page = await unwrap(apiGet<Result<CardSearchPage>>(`/api/cards/search?${params}`));
      return page.cards.slice(0, CATALOG_RESULTS_PER_GAME);
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
