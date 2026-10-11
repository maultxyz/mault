import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import { WEBHOOK_MANAGER_ROLES } from "../../lib/constants/webhooks";
import { sendTestWebhook } from "../../lib/webhooks/endpoints";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const testWebhookRoute = new Hono<AppEnv>().post(
  "/:guid/test",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    if (!WEBHOOK_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can test webhooks.",
      });
    }
    try {
      const target = await authQuery(c.get("jwtClaims"), (tx) =>
        tx.query.webhookEndpoints.findFirst({
          where: and(
            eq(webhookEndpoints.guid, c.req.param("guid")),
            eq(webhookEndpoints.orgId, orgId),
          ),
          columns: { id: true, url: true, secret: true },
        }),
      );
      if (!target) {
        return c.json({ success: false, message: "Webhook not found." });
      }
      const data = await sendTestWebhook(target);
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
