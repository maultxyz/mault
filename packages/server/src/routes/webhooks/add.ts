import {
  WEBHOOK_ENDPOINTS_PER_ORG_LIMIT,
  type CreatedWebhookEndpoint,
} from "@magic-vault/shared";
import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import { isApiAccessAllowed } from "../../lib/api-access";
import {
  WEBHOOK_ENDPOINT_COLUMNS,
  WEBHOOK_MANAGER_ROLES,
  WEBHOOK_UPGRADE_MESSAGE,
} from "../../lib/constants/webhooks";
import { generateWebhookSecret } from "../../lib/webhooks/delivery";
import { toWebhookEndpoint } from "../../lib/webhooks/endpoints";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { webhookInputError, webhookInputSchema } from "./shared";

export const addWebhookRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    if (!WEBHOOK_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can add webhooks.",
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
        if (!(await isApiAccessAllowed(tx, orgId))) {
          return { success: false, message: WEBHOOK_UPGRADE_MESSAGE };
        }
        const [{ value: existing }] = await tx
          .select({ value: count() })
          .from(webhookEndpoints)
          .where(eq(webhookEndpoints.orgId, orgId));
        if (existing >= WEBHOOK_ENDPOINTS_PER_ORG_LIMIT) {
          return {
            success: false,
            message: `An organization can have at most ${WEBHOOK_ENDPOINTS_PER_ORG_LIMIT} webhooks. Delete one first.`,
          };
        }
        const secret = generateWebhookSecret();
        const [row] = await tx
          .insert(webhookEndpoints)
          .values({
            orgId,
            url: input.data.url,
            description: input.data.description,
            events: input.data.events,
            secret,
            createdBy: c.get("userId"),
          })
          .returning(WEBHOOK_ENDPOINT_COLUMNS);
        const data: CreatedWebhookEndpoint = {
          endpoint: await toWebhookEndpoint(row),
          secret,
        };
        return { success: true, data };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
