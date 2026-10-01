import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { notificationRules } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const countNotificationRulesRoute = new Hono<AppEnv>().get(
  "/discord/rules/count",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const [{ total }] = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .select({ total: count() })
          .from(notificationRules)
          .where(eq(notificationRules.orgId, orgId)),
      );
      return c.json({ success: true, data: total });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
