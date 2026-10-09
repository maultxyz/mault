import type { WebhookEndpointList } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { WEBHOOK_MANAGER_ROLES } from "../../lib/constants/webhooks";
import { loadWebhookEndpoints } from "../../lib/webhooks/endpoints";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const listWebhooksRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const endpoints = await authQuery(c.get("jwtClaims"), (tx) =>
        loadWebhookEndpoints(tx, orgId),
      );
      const data: WebhookEndpointList = {
        endpoints,
        canManage: WEBHOOK_MANAGER_ROLES.includes(c.get("orgRole")),
      };
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
