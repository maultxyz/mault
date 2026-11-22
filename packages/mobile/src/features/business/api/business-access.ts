import type { BusinessSettings, BusinessSettingsResponse, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const businessSettingsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["business", "settings", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<BusinessSettingsResponse>>("/api/business/settings")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export const businessAccessQueryOptions = (orgId: string | null) =>
  queryOptions({
    ...businessSettingsQueryOptions(orgId),
    select: (response: BusinessSettingsResponse) => response.access,
  });

export function saveBusinessSettings(settings: BusinessSettings): Promise<BusinessSettings> {
  return unwrap(apiPut<Result<BusinessSettings>>("/api/business/settings", settings));
}
