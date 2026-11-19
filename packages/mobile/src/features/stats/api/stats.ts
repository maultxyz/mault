import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM,
  type Leaderboard,
  type Result,
  type StatsRange,
  type StatsReport,
} from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import { STATS_STALE_MS } from "@/lib/constants/query";

export const statsQueryOptions = (orgId: string | null, range: StatsRange, collectionGuid: string | null) =>
  queryOptions({
    queryKey: ["stats", orgId, range, collectionGuid] as const,
    queryFn: () => {
      const params = new URLSearchParams({ range });
      if (collectionGuid) params.set("collection", collectionGuid);
      return unwrap(apiGet<Result<StatsReport>>(`/api/stats?${params}`));
    },
    enabled: !!orgId,
    staleTime: STATS_STALE_MS,
    placeholderData: keepPreviousData,
  });

export const leaderboardQueryOptions = (orgId: string | null, includeSelfHosted: boolean) =>
  queryOptions({
    queryKey: ["leaderboard", orgId, { includeSelfHosted }] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<Leaderboard>>(
          includeSelfHosted ? `/api/leaderboard?${LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM}=true` : "/api/leaderboard",
        ),
      ),
    enabled: !!orgId,
    staleTime: STATS_STALE_MS,
    placeholderData: keepPreviousData,
  });
