import { Hono } from "hono";
import { loadSubscriptionSummary } from "../../lib/subscription-summary";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const subscriptionSummaryRoute = new Hono<AppEnv>().get(
  "/subscription-summary",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    return c.json({ success: true, data: await loadSubscriptionSummary() });
  },
);
