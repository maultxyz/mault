import type { BillingInterval } from "@magic-vault/shared";

export const BUSINESS_PRICE_ID_ENV: Record<BillingInterval, string> = {
  month: "STRIPE_PRICE_ID_BUSINESS",
  year: "STRIPE_PRICE_ID_BUSINESS_YEARLY",
};
