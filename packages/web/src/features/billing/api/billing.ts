import { apiGet, apiPost } from "@/lib/api/client";
import type { BillingStatus } from "@/lib/interfaces/billing";
import { queryOptions } from "@tanstack/react-query";

export type { BillingStatus };

export async function getBillingStatus(): Promise<{
  success: boolean;
  data?: BillingStatus;
}> {
  return apiGet("/api/billing");
}

export async function createCheckoutSession(): Promise<{
  success: boolean;
  message?: string;
  data?: { url: string };
}> {
  return apiPost("/api/billing/checkout");
}

export async function createPortalSession(): Promise<{
  success: boolean;
  message?: string;
  data?: { url: string };
}> {
  return apiPost("/api/billing/portal");
}

export const billingQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["billing", orgId],
    queryFn: () => getBillingStatus().then((r) => r.data ?? null),
    enabled: !!orgId,
    // A 404 here just means billing isn't configured (self-hosted/no Stripe
    // keys) - not worth retrying.
    retry: false,
  });
