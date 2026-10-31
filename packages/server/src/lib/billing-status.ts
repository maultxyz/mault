import { ACTIVE_SUBSCRIPTION_STATUSES } from "./constants/billing";

export function hasActiveSubscription(
  status: string | null | undefined,
): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.some((active) => active === status);
}
