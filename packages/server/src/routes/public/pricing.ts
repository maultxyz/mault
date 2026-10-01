import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { Hono } from "hono";
import {
  FREE_PLAN_DAILY_SCAN_LIMIT,
  FREE_PLAN_MAX_CONNECTED_SORTERS,
  FREE_PLAN_MAX_NOTIFICATION_RULES,
  FREE_PLAN_MAX_SOUND_RULES,
  getBusinessPriceInfo,
  isBillingEnabled,
} from "../../lib/stripe";
import type { AppEnv } from "../../middleware/auth";

const planLimits = {
  freeDailyScanLimit: FREE_PLAN_DAILY_SCAN_LIMIT,
  freeMaxConnectedSorters: Math.min(
    FREE_PLAN_MAX_CONNECTED_SORTERS,
    MAX_CONNECTED_SORTERS,
  ),
  freeMaxSoundRules: FREE_PLAN_MAX_SOUND_RULES,
  freeMaxNotificationRules: FREE_PLAN_MAX_NOTIFICATION_RULES,
  maxConnectedSorters: MAX_CONNECTED_SORTERS,
};

// GET /public/pricing — unauthenticated, for the marketing/landing page.
// Reads the live Stripe price rather than a hardcoded figure.
export const pricingRoute = new Hono<AppEnv>().get("/pricing", async (c) => {
  try {
    const business = isBillingEnabled() ? await getBusinessPriceInfo() : null;
    return c.json({ success: true, data: { business, ...planLimits } });
  } catch (err) {
    console.error(err);
    return c.json({ success: true, data: { business: null, ...planLimits } });
  }
});
