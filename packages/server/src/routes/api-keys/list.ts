import type { OrgApiKeyList } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { loadOrgApiKeys } from "../../lib/api-keys";
import { API_KEY_MANAGER_ROLES } from "../../lib/constants/api-keys";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const listApiKeysRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const keys = await authQuery(c.get("jwtClaims"), (tx) =>
        loadOrgApiKeys(tx, orgId),
      );
      const data: OrgApiKeyList = {
        keys,
        canManage: API_KEY_MANAGER_ROLES.includes(c.get("orgRole")),
      };
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
