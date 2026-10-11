import {
  API_KEYS_PER_ORG_LIMIT,
  type CreatedOrgApiKey,
} from "@magic-vault/shared";
import { and, count, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgApiKeys } from "../../db/schema";
import { isApiAccessAllowed } from "../../lib/api-access";
import { generateApiKey, toOrgApiKey } from "../../lib/api-keys";
import {
  API_ACCESS_UPGRADE_MESSAGE,
  API_KEY_MANAGER_ROLES,
  ORG_API_KEY_COLUMNS,
} from "../../lib/constants/api-keys";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { apiKeyInputSchema } from "./shared";

export const addApiKeyRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    if (!API_KEY_MANAGER_ROLES.includes(c.get("orgRole"))) {
      return c.json({
        success: false,
        message: "Only organization owners and admins can create API keys.",
      });
    }
    const input = apiKeyInputSchema.safeParse(await c.req.json());
    if (!input.success) {
      return c.json({ success: false, message: "Invalid API key." }, 400);
    }
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        if (!(await isApiAccessAllowed(tx, orgId))) {
          return { success: false, message: API_ACCESS_UPGRADE_MESSAGE };
        }
        const [{ value: liveKeys }] = await tx
          .select({ value: count() })
          .from(orgApiKeys)
          .where(
            and(eq(orgApiKeys.orgId, orgId), isNull(orgApiKeys.revokedAt)),
          );
        if (liveKeys >= API_KEYS_PER_ORG_LIMIT) {
          return {
            success: false,
            message: `An organization can have at most ${API_KEYS_PER_ORG_LIMIT} API keys. Revoke one first.`,
          };
        }
        const { rawKey, keyPrefix, keyHash } = generateApiKey();
        const [row] = await tx
          .insert(orgApiKeys)
          .values({
            orgId,
            name: input.data.name,
            scope: input.data.scope,
            keyPrefix,
            keyHash,
            createdBy: c.get("userId"),
          })
          .returning(ORG_API_KEY_COLUMNS);
        const data: CreatedOrgApiKey = {
          apiKey: await toOrgApiKey(row),
          rawKey,
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
