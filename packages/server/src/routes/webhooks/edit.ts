import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import {
  WEBHOOK_ENDPOINT_COLUMNS,
  WEBHOOK_MANAGER_ROLES,
} from "../../lib/constants/webhooks";
import { toWebhookEndpoint } from "../../lib/webhooks/endpoints";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { webhookInputError, webhookInputSchema } from "./shared";

export const editWebhookRoute = new Hono<AppEnv>()
  .put("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    if (!WEBHOOK_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can edit webhooks.",
      });
    }
    const input = webhookInputSchema.safeParse(await c.req.json());
    if (!input.success) {
      return c.json(
        { success: false, message: webhookInputError(input.error) },
        400,
      );
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [row] = await tx
          .update(webhookEndpoints)
          .set({
            url: input.data.url,
            description: input.data.description,
            events: input.data.events,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(webhookEndpoints.guid, c.req.param("guid")),
              eq(webhookEndpoints.orgId, orgId),
            ),
          )
          .returning(WEBHOOK_ENDPOINT_COLUMNS);
        return row
          ? { success: true, data: await toWebhookEndpoint(row) }
          : { success: false, message: "Webhook not found." };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .post("/:guid/enable", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    if (!WEBHOOK_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can enable webhooks.",
      });
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [row] = await tx
          .update(webhookEndpoints)
          .set({
            disabledAt: null,
            disabledReason: null,
            consecutiveFailures: 0,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(webhookEndpoints.guid, c.req.param("guid")),
              eq(webhookEndpoints.orgId, orgId),
            ),
          )
          .returning(WEBHOOK_ENDPOINT_COLUMNS);
        return row
          ? { success: true, data: await toWebhookEndpoint(row) }
          : { success: false, message: "Webhook not found." };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });
