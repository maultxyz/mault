import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { Result, StatsRange, StatsReport } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import { STATS_STALE_MS } from "@/lib/constants/query";

export const statsQueryOptions = (orgId: string | null, range: StatsRange) =>
  queryOptions({
    queryKey: ["stats", orgId, range] as const,
    queryFn: () =>
      unwrap(apiGet<Result<StatsReport>>(`/api/stats?${new URLSearchParams({ range })}`)),
    enabled: !!orgId,
    staleTime: STATS_STALE_MS,
    placeholderData: keepPreviousData,
  });
