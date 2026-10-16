import { queryOptions } from "@tanstack/react-query";
import type { OrgOverview, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import { OVERVIEW_REFRESH_MS } from "@/lib/constants/query";

export const orgOverviewQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["org-overview", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<OrgOverview>>("/api/overview")),
    enabled: !!orgId,
    staleTime: OVERVIEW_REFRESH_MS,
    refetchInterval: OVERVIEW_REFRESH_MS,
  });
