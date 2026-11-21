import { queryOptions } from "@tanstack/react-query";
import { apiGet, unwrapOr } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import { loadPublicVersionInfo } from "@/lib/public-version-info";
import type { BillingStatus } from "@magic-vault/shared";

async function loadBillingStatus(): Promise<BillingStatus | null> {
  const versionInfo = await loadPublicVersionInfo();
  if (versionInfo?.billingEnabled === false) return null;
  return unwrapOr(apiGet<{ success: boolean; data?: BillingStatus }>("/api/billing"), null);
}

export const billingQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["billing", orgId] as const,
    queryFn: loadBillingStatus,
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
    retry: false,
  });
