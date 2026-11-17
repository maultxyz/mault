import { INACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/constants/billing";
import type { BillingStatus } from "@magic-vault/shared";

export function hasActiveSubscription(billing: BillingStatus | null): boolean {
  if (!billing || billing.plan === "free" || billing.cancelAtPeriodEnd) {
    return false;
  }
  return !INACTIVE_SUBSCRIPTION_STATUSES.some((s) => s === billing.status);
}
