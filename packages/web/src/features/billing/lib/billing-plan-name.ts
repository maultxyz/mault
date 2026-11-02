import { LEGACY_BUSINESS_PLAN, type BillingStatus } from "@magic-vault/shared";

export function billingPlanNameKey(billing: BillingStatus): string {
  return billing.isLegacyPlan ? LEGACY_BUSINESS_PLAN : billing.plan;
}
