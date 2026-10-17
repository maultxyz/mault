import { infiniteQueryOptions } from "@tanstack/react-query";
import type { CardSearchPage, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import { CARD_SEARCH_MIN_LENGTH } from "@/lib/constants/cards";

export const cardSearchQueryOptions = (query: string, collectionGuid: string) =>
  infiniteQueryOptions({
    queryKey: ["card-search", query, collectionGuid] as const,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ q: query, collectionGuid });
      if (pageParam > 0) params.set("offset", String(pageParam));
      return unwrap(apiGet<Result<CardSearchPage>>(`/api/cards/search?${params}`));
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: query.trim().length >= CARD_SEARCH_MIN_LENGTH,
    staleTime: 60_000,
  });
