import type { BusinessSettingsResponse, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiGet, unwrap } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const businessAccessQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["business", "settings", orgId] as const,
    queryFn: () =>
      unwrap(apiGet<Result<BusinessSettingsResponse>>("/api/business/settings")).then(
        (response) => response.access,
      ),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });
