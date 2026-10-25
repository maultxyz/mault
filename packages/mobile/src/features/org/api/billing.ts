import { queryOptions } from "@tanstack/react-query";
import { apiGet, unwrapOr } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import type { BillingStatus } from "@/lib/interfaces/billing";

export const billingQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["billing", orgId] as const,
    queryFn: () =>
      unwrapOr(apiGet<{ success: boolean; data?: BillingStatus }>("/api/billing"), null),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
    retry: false,
  });
