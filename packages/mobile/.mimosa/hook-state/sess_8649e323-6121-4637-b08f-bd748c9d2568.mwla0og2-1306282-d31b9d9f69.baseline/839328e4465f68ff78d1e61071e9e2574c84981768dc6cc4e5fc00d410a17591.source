import { queryOptions } from "@tanstack/react-query";
import type { Game, Result } from "@magic-vault/shared";
import { apiGet, unwrapOr } from "@/lib/api/client";

export const gamesQueryOptions = queryOptions({
  queryKey: ["games"] as const,
  queryFn: () => unwrapOr(apiGet<Result<Game[]>>("/api/games"), []),
  staleTime: Infinity,
});

export const gameLanguagesQueryOptions = (gameGuid: string | null) =>
  queryOptions({
    queryKey: ["games", gameGuid, "languages"] as const,
    queryFn: () => unwrapOr(apiGet<Result<string[]>>(`/api/games/${gameGuid}/languages`), []),
    enabled: !!gameGuid,
    staleTime: Infinity,
  });
