import { apiGet, apiPost } from "@/lib/api/client";
import { BILLING_STALE_MS } from "@/lib/constants/timing";
import type { CheckoutRequest } from "@/lib/interfaces/billing";
import type { BillingStatus } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";


export async function getBillingStatus(): Promise<{
  success: boolean;
  data?: BillingStatus;
}> {
  return apiGet("/api/billing");
}

export async function createCheckoutSession(
  request: CheckoutRequest,
): Promise<{
  success: boolean;
  message?: string;
  data?: { url: string };
}> {
  return apiPost("/api/billing/checkout", request);
}

export async function createPortalSession(): Promise<{
  success: boolean;
  message?: string;
  data?: { url: string };
}> {
  return apiPost("/api/billing/portal");
}

export const billingKeys = {
  root: () => ["billing"] as const,
};

export const billingQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: [...billingKeys.root(), orgId],
    queryFn: () => getBillingStatus().then((r) => r.data ?? null),
    enabled: !!orgId,
    staleTime: BILLING_STALE_MS,
    retry: false,
  });
