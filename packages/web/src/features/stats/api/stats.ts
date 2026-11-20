import { apiGet } from "@/lib/api/client";
import { ORG_OVERVIEW_REFRESH_MS } from "@/lib/constants/timing";
import { STORED_STATS_REFRESHING_POLL_MS } from "@magic-vault/shared";
import type { Result, StatsRange, StatsReport } from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export async function loadStatsReport(
  range: StatsRange,
  collectionGuid: string | null,
): Promise<Result<StatsReport>> {
  const params = new URLSearchParams({ range });
  if (collectionGuid) params.set("collection", collectionGuid);
  return apiGet<Result<StatsReport>>(`/api/stats?${params.toString()}`);
}

export const statsReportQueryOptions = (
  orgId: string | undefined,
  range: StatsRange,
  collectionGuid: string | null,
) =>
  queryOptions({
    queryKey: ["stats-report", orgId, range, collectionGuid] as const,
    queryFn: () =>
      loadStatsReport(range, collectionGuid).then((r) => r.data ?? null),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
    refetchInterval: (query) =>
      query.state.data?.isRefreshing ? STORED_STATS_REFRESHING_POLL_MS : false,
    placeholderData: keepPreviousData,
  });
