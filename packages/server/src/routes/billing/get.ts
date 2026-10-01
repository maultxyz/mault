import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgBilling } from "../../db/schema";
import { getScansToday } from "../../lib/scan-usage";
import { sorterLimitForPlan } from "../../lib/sorter-limit";
import { notificationRuleLimitForPlan } from "../../lib/notification-rule-limit";
import { soundRuleLimitForPlan } from "../../lib/sound-rule-limit";
import { FREE_PLAN_DAILY_SCAN_LIMIT } from "../../lib/stripe";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const getBillingRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const billing = await tx.query.orgBilling.findFirst({
          where: eq(orgBilling.orgId, orgId),
        });
        const count = await getScansToday(tx, orgId);

        const plan = (billing?.plan as "free" | "business") ?? "free";
        return {
          success: true,
          message: "Loaded.",
          data: {
            plan,
            status: billing?.status ?? null,
            cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
            currentPeriodEnd: billing?.currentPeriodEnd ?? null,
            cardsScannedToday: count,
            dailyLimit: plan === "business" ? null : FREE_PLAN_DAILY_SCAN_LIMIT,
            maxConnectedSorters: sorterLimitForPlan(plan),
            maxSoundRules: soundRuleLimitForPlan(plan),
            maxNotificationRules: notificationRuleLimitForPlan(plan),
          },
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
