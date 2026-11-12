import { queryOptions } from "@tanstack/react-query";
import type { Game, GameInput, Result } from "@magic-vault/shared";
import { apiGet, apiRequest, unwrap } from "@/lib/api/client";
import { ADMIN_CARDS_QUERY_KEY, ADMIN_FAILURE_STATUSES_WITH_MESSAGE } from "@/lib/constants/admin-cards";

export const gameKeyAvailabilityQueryOptions = (gameKey: string, enabled: boolean) =>
  queryOptions({
    queryKey: [...ADMIN_CARDS_QUERY_KEY, "game-key-availability", gameKey] as const,
    queryFn: () =>
      unwrap(apiGet<Result<{ available: boolean }>>(`/api/games/check-key?${new URLSearchParams({ key: gameKey }).toString()}`)),
    enabled: enabled && !!gameKey,
    staleTime: 0,
  });

export function createGame(input: GameInput): Promise<Game> {
  return unwrap(
    apiRequest<Result<Game>>("/api/games", { method: "POST", body: input, acceptStatuses: ADMIN_FAILURE_STATUSES_WITH_MESSAGE }),
  );
}

export function updateGame(gameGuid: string, input: Partial<GameInput>): Promise<Game> {
  return unwrap(
    apiRequest<Result<Game>>(`/api/games/${gameGuid}`, {
      method: "PUT",
      body: input,
      acceptStatuses: ADMIN_FAILURE_STATUSES_WITH_MESSAGE,
    }),
  );
}

export async function deleteGame(gameGuid: string): Promise<void> {
  const result = await apiRequest<Result<null>>(`/api/games/${gameGuid}`, {
    method: "DELETE",
    acceptStatuses: ADMIN_FAILURE_STATUSES_WITH_MESSAGE,
  });
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}
