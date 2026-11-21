import { apiGet } from "@/lib/api/client";
import { ORG_OVERVIEW_REFRESH_MS } from "@/lib/constants/timing";
import {
  leaderboardQueryString,
  type Leaderboard,
  type LeaderboardQuery,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const leaderboardKeys = {
  root: () => ["leaderboard"] as const,
  org: (orgId: string | undefined, query: LeaderboardQuery) =>
    ["leaderboard", orgId, query] as const,
};

export async function loadLeaderboard(
  query: LeaderboardQuery,
): Promise<Result<Leaderboard>> {
  return apiGet<Result<Leaderboard>>(
    `/api/leaderboard${leaderboardQueryString(query)}`,
  );
}

export const leaderboardQueryOptions = (
  orgId: string | undefined,
  query: LeaderboardQuery,
) =>
  queryOptions({
    queryKey: leaderboardKeys.org(orgId, query),
    queryFn: () => loadLeaderboard(query).then((r) => r.data ?? null),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
  });
