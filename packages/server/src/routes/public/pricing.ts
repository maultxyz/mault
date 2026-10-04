import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { Hono } from "hono";
import { getPlanConfig } from "../../lib/plan-config";
import { getBusinessPriceInfo, isBillingEnabled } from "../../lib/stripe";
import type { AppEnv } from "../../middleware/auth";

function planDetails() {
  return { plans: getPlanConfig(), maxConnectedSorters: MAX_CONNECTED_SORTERS };
}

// GET /public/pricing — unauthenticated, for the marketing/landing page.
// Reads the live Stripe price rather than a hardcoded figure.
export const pricingRoute = new Hono<AppEnv>().get("/pricing", async (c) => {
  try {
    const business = isBillingEnabled() ? await getBusinessPriceInfo() : null;
    return c.json({ success: true, data: { business, ...planDetails() } });
  } catch (err) {
    console.error(err);
    return c.json({
      success: true,
      data: { business: null, ...planDetails() },
    });
  }
});
