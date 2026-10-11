import { apiGet } from "@/lib/api/client";
import { ORG_OVERVIEW_REFRESH_MS } from "@/lib/constants/timing";
import type { Leaderboard, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const leaderboardKeys = {
  root: () => ["leaderboard"] as const,
  org: (orgId: string | undefined) => ["leaderboard", orgId] as const,
};

export async function loadLeaderboard(): Promise<Result<Leaderboard>> {
  return apiGet<Result<Leaderboard>>("/api/leaderboard");
}

export const leaderboardQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: leaderboardKeys.org(orgId),
    queryFn: () => loadLeaderboard().then((r) => r.data ?? null),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
  });
