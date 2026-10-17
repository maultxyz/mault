import { queryOptions } from "@tanstack/react-query";
import type { Game, Result } from "@magic-vault/shared";
import { apiGet } from "@/lib/api/client";

export const gamesQueryOptions = queryOptions({
  queryKey: ["games"] as const,
  queryFn: () => apiGet<Result<Game[]>>("/api/games").then((result) => result.data ?? []),
  staleTime: Infinity,
});

export const gameLanguagesQueryOptions = (gameGuid: string | null) =>
  queryOptions({
    queryKey: ["games", gameGuid, "languages"] as const,
    queryFn: () => apiGet<Result<string[]>>(`/api/games/${gameGuid}/languages`).then((result) => result.data ?? []),
    enabled: !!gameGuid,
    staleTime: Infinity,
  });
