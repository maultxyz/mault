import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import { WEBHOOK_MANAGER_ROLES } from "../../lib/constants/webhooks";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const deleteWebhookRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    if (!WEBHOOK_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can delete webhooks.",
      });
    }
    try {
      const deleted = await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .delete(webhookEndpoints)
          .where(
            and(
              eq(webhookEndpoints.guid, c.req.param("guid")),
              eq(webhookEndpoints.orgId, orgId),
            ),
          )
          .returning({ id: webhookEndpoints.id }),
      );
      return c.json(
        deleted.length === 0
          ? { success: false, message: "Webhook not found." }
          : { success: true, message: "Webhook deleted." },
      );
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
