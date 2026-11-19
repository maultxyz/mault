import { apiGet } from "@/lib/api/client";
import { ORG_OVERVIEW_REFRESH_MS } from "@/lib/constants/timing";
import {
  LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM,
  type Leaderboard,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const leaderboardKeys = {
  root: () => ["leaderboard"] as const,
  org: (orgId: string | undefined, includeSelfHosted: boolean) =>
    ["leaderboard", orgId, { includeSelfHosted }] as const,
};

export async function loadLeaderboard(
  includeSelfHosted: boolean,
): Promise<Result<Leaderboard>> {
  const query = includeSelfHosted
    ? `?${LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM}=true`
    : "";
  return apiGet<Result<Leaderboard>>(`/api/leaderboard${query}`);
}

export const leaderboardQueryOptions = (
  orgId: string | undefined,
  includeSelfHosted: boolean,
) =>
  queryOptions({
    queryKey: leaderboardKeys.org(orgId, includeSelfHosted),
    queryFn: () => loadLeaderboard(includeSelfHosted).then((r) => r.data ?? null),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
  });
