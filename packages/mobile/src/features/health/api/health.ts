import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { CardSearchPage, GameCoverage, HealthCheckResponse, PlayingCard, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import { CARD_SEARCH_MIN_LENGTH } from "@/lib/constants/cards";
import { HEALTH_REFETCH_MS } from "@/lib/constants/health";

export const healthQueryOptions = queryOptions({
  queryKey: ["health"] as const,
  queryFn: () => apiGet<Result<HealthCheckResponse>>("/api/public/health").then((r) => r.data ?? null),
  refetchInterval: HEALTH_REFETCH_MS,
});

export const gameCoverageQueryOptions = queryOptions({
  queryKey: ["games", "coverage"] as const,
  queryFn: () => apiGet<Result<GameCoverage[]>>("/api/games/coverage").then((r) => r.data ?? []),
  staleTime: 30_000,
});

export const gameCardSearchQueryOptions = (query: string, gameKey: string | null, lang: string) =>
  infiniteQueryOptions({
    queryKey: ["game-card-search", query, gameKey, lang] as const,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ q: query, gameKey: gameKey ?? "", lang });
      if (pageParam > 0) params.set("offset", String(pageParam));
      return unwrap(apiGet<Result<CardSearchPage>>(`/api/cards/search?${params}`));
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: !!gameKey && query.trim().length >= CARD_SEARCH_MIN_LENGTH,
    staleTime: 60_000,
  });

export const sampleCardQueryOptions = (gameKey: string, lang: string | null, index: number) =>
  queryOptions({
    queryKey: ["ocr-sample-card", gameKey, lang, index] as const,
    queryFn: () => {
      const params = new URLSearchParams({ gameKey, lang: lang ?? "en", index: String(index) });
      return apiGet<Result<PlayingCard | null>>(`/api/cards/sample?${params}`).then((r) => r.data ?? null);
    },
    enabled: !!lang,
    staleTime: Infinity,
  });
