import { Hono } from "hono";
import { FREE_PLAN_DAILY_SCAN_LIMIT, getBusinessPriceInfo, isBillingEnabled } from "../../lib/stripe";
import type { AppEnv } from "../../middleware/auth";

// GET /public/pricing — unauthenticated, for the marketing/landing page.
// Reads the live Stripe price rather than a hardcoded figure.
export const pricingRoute = new Hono<AppEnv>().get("/pricing", async (c) => {
  try {
    const business = isBillingEnabled() ? await getBusinessPriceInfo() : null;
    return c.json({
      success: true,
      data: { business, freeDailyScanLimit: FREE_PLAN_DAILY_SCAN_LIMIT },
    });
  } catch (err) {
    console.error(err);
    return c.json({
      success: true,
      data: { business: null, freeDailyScanLimit: FREE_PLAN_DAILY_SCAN_LIMIT },
    });
  }
});
