import { queryOptions } from "@tanstack/react-query";
import { STORED_STATS_REFRESHING_POLL_MS, type OrgOverview, type Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import { OVERVIEW_REFRESH_MS } from "@/lib/constants/query";

export const orgOverviewQueryOptions = (orgId: string | null, isScreenFocused = true) =>
  queryOptions({
    queryKey: ["org-overview", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<OrgOverview>>("/api/overview")),
    enabled: !!orgId,
    staleTime: OVERVIEW_REFRESH_MS,
    refetchInterval: (query) => {
      if (!isScreenFocused) return false;
      return query.state.data?.isRefreshing ? STORED_STATS_REFRESHING_POLL_MS : OVERVIEW_REFRESH_MS;
    },
    refetchOnWindowFocus: true,
  });
