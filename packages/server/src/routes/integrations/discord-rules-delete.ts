import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { notificationRules } from "../../db/schema";
import { loadNotificationRules } from "../../lib/notification-rules";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const deleteNotificationRuleRoute = new Hono<AppEnv>().delete(
  "/discord/rules/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const rules = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [deleted] = await tx
          .update(notificationRules)
          .set({ isDeleted: true })
          .where(
            and(
              eq(notificationRules.guid, guid),
              eq(notificationRules.orgId, orgId),
              eq(notificationRules.isDeleted, false),
            ),
          )
          .returning({ gameId: notificationRules.gameId });
        return deleted ? loadNotificationRules(tx, orgId, deleted.gameId) : [];
      });
      return c.json({ success: true, data: rules });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
