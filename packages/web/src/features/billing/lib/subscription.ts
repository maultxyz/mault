import { INACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/constants/billing";
import type { BillingStatus } from "@/lib/interfaces/billing";

export function hasActiveSubscription(billing: BillingStatus | null): boolean {
  if (!billing || billing.plan !== "business" || billing.cancelAtPeriodEnd) {
    return false;
  }
  return !INACTIVE_SUBSCRIPTION_STATUSES.some((s) => s === billing.status);
}
