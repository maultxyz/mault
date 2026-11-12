import { queryOptions } from "@tanstack/react-query";
import type { OwnedCardSearchResult, Result } from "@magic-vault/shared";
import { apiGet } from "@/lib/api/client";
import { OWNED_CARD_SEARCH_QUERY_KEY } from "@/lib/constants/search";

export const ownedCardSearchQueryOptions = (orgId: string | null, query: string, enabled: boolean) =>
  queryOptions({
    queryKey: [OWNED_CARD_SEARCH_QUERY_KEY, orgId, query] as const,
    queryFn: async (): Promise<OwnedCardSearchResult[]> => {
      const result = await apiGet<Result<OwnedCardSearchResult[]>>(
        `/api/collections/cards/search?${new URLSearchParams({ q: query }).toString()}`,
      );
      if (!result.success) throw new Error(result.message ?? "Search failed.");
      return result.data ?? [];
    },
    enabled: !!orgId && enabled,
  });
