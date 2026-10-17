import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { Leaderboard, Result, StatsRange, StatsReport } from "@magic-vault/shared";
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

export const leaderboardQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["leaderboard", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<Leaderboard>>("/api/leaderboard")),
    enabled: !!orgId,
    staleTime: STATS_STALE_MS,
  });
