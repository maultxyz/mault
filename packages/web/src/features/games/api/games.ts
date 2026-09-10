import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { GameInput, SampleCard } from "@/lib/interfaces/games";
import type {
  Game,
  GameCoverage,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export type { GameInput, SampleCard };

export async function listGames(): Promise<Result<Game[]>> {
  return apiGet<Result<Game[]>>("/api/games");
}

export const gamesQueryOptions = queryOptions({
  queryKey: ["games"] as const,
  queryFn: () => listGames().then((r) => r.data ?? []),
  staleTime: Infinity,
});

export async function listGameLanguages(guid: string): Promise<Result<string[]>> {
  return apiGet<Result<string[]>>(`/api/games/${guid}/languages`);
}

export const gameLanguagesQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: ["games", guid, "languages"] as const,
    queryFn: () => listGameLanguages(guid!).then((r) => r.data ?? []),
    enabled: !!guid,
    staleTime: Infinity,
  });

export async function listGameCoverage(): Promise<Result<GameCoverage[]>> {
  return apiGet<Result<GameCoverage[]>>("/api/games/coverage");
}

export const gameCoverageQueryOptions = queryOptions({
  queryKey: ["games", "coverage"] as const,
  queryFn: () => listGameCoverage().then((r) => r.data ?? []),
  staleTime: 30_000,
});

export async function createGame(input: GameInput): Promise<Result<Game>> {
  return apiPost<Result<Game>>("/api/games", input);
}

export async function updateGame(
  guid: string,
  input: Partial<GameInput>,
): Promise<Result<Game>> {
  return apiPut<Result<Game>>(`/api/games/${guid}`, input);
}

export async function deleteGame(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/games/${guid}`);
}

export async function checkGameKey(
  key: string,
  excludeGuid?: string,
): Promise<Result<{ available: boolean }>> {
  const params = new URLSearchParams({ key });
  if (excludeGuid) params.set("excludeGuid", excludeGuid);
  return apiGet<Result<{ available: boolean }>>(
    `/api/games/check-key?${params.toString()}`,
  );
}

export async function getSampleCard(
  key: string,
  query: string,
): Promise<Result<SampleCard>> {
  return apiGet<Result<SampleCard>>(
    `/api/games/sample-card?key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}`,
  );
}
