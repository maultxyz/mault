import type { BillingInterval, PaidPlanKey, PlanKey } from "@magic-vault/shared";

export const PLAN_PRICE_ID_ENV: Record<
  PaidPlanKey,
  Record<BillingInterval, string>
> = {
  enthusiast: {
    month: "STRIPE_PRICE_ID_ENTHUSIAST",
    year: "STRIPE_PRICE_ID_ENTHUSIAST_YEARLY",
  },
  business: {
    month: "STRIPE_PRICE_ID_BUSINESS",
    year: "STRIPE_PRICE_ID_BUSINESS_YEARLY",
  },
};

export const LEGACY_BUSINESS_PRICE_ID_ENV: Record<BillingInterval, string> = {
  month: "STRIPE_PRICE_ID_LEGACY_BUSINESS",
  year: "STRIPE_PRICE_ID_LEGACY_BUSINESS_YEARLY",
};

export const ENTHUSIAST_PLAN_DAILY_SCAN_LIMIT = 500;
export const ENTHUSIAST_PLAN_MAX_CONNECTED_SORTERS = 2;
export const ENTHUSIAST_PLAN_MAX_SOUND_RULES = 5;
export const ENTHUSIAST_PLAN_MAX_NOTIFICATION_RULES = 5;

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;
export const TRIALING_SUBSCRIPTION_STATUS = "trialing";
export const MONTHS_PER_PRICE_INTERVAL: Record<string, number> = {
  day: 12 / 365,
  week: 12 / 52,
  month: 1,
  year: 12,
};
export const PLATFORM_BILLING_SETTINGS_ID = "platform";

export const PLAN_RANK: Record<PlanKey, number> = {
  free: 0,
  enthusiast: 1,
  business: 2,
  legacyBusiness: 2,
};
