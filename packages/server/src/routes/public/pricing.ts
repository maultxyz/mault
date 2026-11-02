import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { Hono } from "hono";
import { getPlanConfig } from "../../lib/plan-config";
import { isLegacyPricingActive } from "../../lib/pricing-mode";
import { getPaidPlanPrices, isBillingEnabled } from "../../lib/stripe";
import type { AppEnv } from "../../middleware/auth";

function planDetails() {
  const plans = getPlanConfig();
  return {
    plans: isLegacyPricingActive()
      ? { ...plans, business: plans.legacyBusiness }
      : plans,
    maxConnectedSorters: MAX_CONNECTED_SORTERS,
  };
}

export const pricingRoute = new Hono<AppEnv>().get("/pricing", async (c) => {
  const planPrices = isBillingEnabled() ? await getPaidPlanPrices() : null;
  return c.json({
    success: true,
    data: {
      business: planPrices?.business.month ?? null,
      businessYearly: planPrices?.business.year ?? null,
      planPrices,
      ...planDetails(),
    },
  });
});
