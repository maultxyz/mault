import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { CardSearchPage, CardSetOption, GameCoverage, HealthCheckResponse, PlayingCard, Result } from "@magic-vault/shared";
import { apiGet, unwrap, unwrapOr } from "@/lib/api/client";
import { CARD_SEARCH_MIN_LENGTH } from "@/lib/constants/cards";
import { HEALTH_REFETCH_MS } from "@/lib/constants/health";

export const healthQueryOptions = queryOptions({
  queryKey: ["health"] as const,
  queryFn: () => unwrapOr(apiGet<Result<HealthCheckResponse>>("/api/public/health"), null),
  refetchInterval: HEALTH_REFETCH_MS,
});

export const gameCoverageQueryOptions = queryOptions({
  queryKey: ["games", "coverage"] as const,
  queryFn: () => unwrapOr(apiGet<Result<GameCoverage[]>>("/api/games/coverage"), []),
  staleTime: 30_000,
});

export const gameCardSearchQueryOptions = (query: string, gameKey: string | null, lang: string, setCode: string | null) =>
  infiniteQueryOptions({
    queryKey: ["game-card-search", query, gameKey, lang, setCode] as const,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ q: query, gameKey: gameKey ?? "", lang });
      if (pageParam > 0) params.set("offset", String(pageParam));
      if (setCode) params.set("set", setCode);
      return unwrap(apiGet<Result<CardSearchPage>>(`/api/cards/search?${params}`));
    },
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: !!gameKey && query.trim().length >= CARD_SEARCH_MIN_LENGTH,
    staleTime: 60_000,
  });

export const gameCardSetsQueryOptions = (query: string, gameKey: string | null, lang: string) =>
  queryOptions({
    queryKey: ["game-card-sets", query, gameKey, lang] as const,
    queryFn: () => {
      const params = new URLSearchParams({ q: query, gameKey: gameKey ?? "", lang });
      return unwrapOr(apiGet<Result<CardSetOption[]>>(`/api/cards/sets?${params}`), []);
    },
    enabled: !!gameKey && query.trim().length >= CARD_SEARCH_MIN_LENGTH,
    staleTime: 60_000,
  });

export const sampleCardQueryOptions = (gameKey: string, lang: string | null, index: number) =>
  queryOptions({
    queryKey: ["ocr-sample-card", gameKey, lang, index] as const,
    queryFn: () => {
      const params = new URLSearchParams({ gameKey, lang: lang ?? "en", index: String(index) });
      return unwrapOr(apiGet<Result<PlayingCard | null>>(`/api/cards/sample?${params}`), null);
    },
    enabled: !!lang,
    staleTime: Infinity,
  });
