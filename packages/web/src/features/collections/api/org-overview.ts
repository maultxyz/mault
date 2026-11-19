import { apiGet } from "@/lib/api/client";
import { ORG_OVERVIEW_QUERY_KEY } from "@/lib/constants/home";
import { ORG_OVERVIEW_REFRESH_MS } from "@/lib/constants/timing";
import type { OrgOverview, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export async function loadOrgOverview(): Promise<Result<OrgOverview>> {
  return apiGet<Result<OrgOverview>>("/api/overview");
}

export const orgOverviewQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: [ORG_OVERVIEW_QUERY_KEY, orgId] as const,
    queryFn: () => loadOrgOverview().then((r) => r.data ?? null),
    enabled: !!orgId,
    staleTime: ORG_OVERVIEW_REFRESH_MS,
  });
