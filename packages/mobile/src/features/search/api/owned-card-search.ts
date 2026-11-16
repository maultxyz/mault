import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  GLOBAL_SEARCH_OWNED_CARDS_PAGE_SIZE,
  OWNED_CARD_SEARCH_GAME_PARAM,
  OWNED_CARD_SEARCH_LIMIT_PARAM,
  OWNED_CARD_SEARCH_OFFSET_PARAM,
  type OwnedCardSearchPage,
  type OwnedCardSearchResult,
  type Result,
} from "@magic-vault/shared";
import { apiGet } from "@/lib/api/client";
import { OWNED_CARD_SEARCH_QUERY_KEY } from "@/lib/constants/search";

export const ownedCardSearchQueryOptions = (
  orgId: string | null,
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
      const result = await apiGet<Result<OwnedCardSearchResult[]>>(`/api/collections/cards/search?${params.toString()}`);
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
