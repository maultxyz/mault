import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgApiKeys } from "../../db/schema";
import { API_KEY_MANAGER_ROLES } from "../../lib/constants/api-keys";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const revokeApiKeyRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    if (!API_KEY_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can revoke API keys.",
      });
    }
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const revoked = await tx
          .update(orgApiKeys)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(orgApiKeys.guid, guid),
              eq(orgApiKeys.orgId, orgId),
              isNull(orgApiKeys.revokedAt),
            ),
          )
          .returning({ id: orgApiKeys.id });
        return revoked.length === 0
          ? { success: false, message: "API key not found." }
          : { success: true, message: "API key revoked." };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
