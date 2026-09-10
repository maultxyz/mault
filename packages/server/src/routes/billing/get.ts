import { and, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards, orgBilling } from "../../db/schema";
import { FREE_PLAN_DAILY_SCAN_LIMIT } from "../../lib/stripe";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

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
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(collectionCards)
          .where(
            and(
              eq(collectionCards.orgId, orgId),
              gte(collectionCards.scannedAt, startOfTodayUtc()),
            ),
          );

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
