import {
  SYNC_API_KEY_PREFIX,
  SYNC_API_KEYS_LIMIT,
  syncApiKeyFormSchema,
  type CreatedSyncApiKey,
} from "@magic-vault/shared";
import { and, count, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { platformSyncApiKeys } from "../../db/schema";
import { generateApiKey } from "../../lib/api-keys";
import { SYNC_API_KEY_COLUMNS } from "../../lib/constants/sync-api-keys";
import { loadSyncApiKeys, toSyncApiKey } from "../../lib/sync-api-keys";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const syncApiKeysRoute = new Hono<AppEnv>()
  .get("/sync-api-keys", requireAuth, requireRole("admin"), async (c) => {
    return c.json({ success: true, data: await loadSyncApiKeys() });
  })
  .post("/sync-api-keys", requireAuth, requireRole("admin"), async (c) => {
    const input = syncApiKeyFormSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!input.success) {
      return c.json({ success: false, message: "Invalid API key." }, 400);
    }
    const [{ value: liveKeys }] = await db
      .select({ value: count() })
      .from(platformSyncApiKeys)
      .where(isNull(platformSyncApiKeys.revokedAt));
    if (liveKeys >= SYNC_API_KEYS_LIMIT) {
      return c.json({
        success: false,
        message: `There can be at most ${SYNC_API_KEYS_LIMIT} sync API keys. Revoke one first.`,
      });
    }
    const { rawKey, keyPrefix, keyHash } = generateApiKey(SYNC_API_KEY_PREFIX);
    const [row] = await db
      .insert(platformSyncApiKeys)
      .values({
        name: input.data.name,
        permissions: input.data.permissions,
        keyPrefix,
        keyHash,
        createdBy: c.get("userId"),
      })
      .returning(SYNC_API_KEY_COLUMNS);
    const data: CreatedSyncApiKey = { apiKey: await toSyncApiKey(row), rawKey };
    return c.json({ success: true, data });
  })
  .delete(
    "/sync-api-keys/:guid",
    requireAuth,
    requireRole("admin"),
    async (c) => {
      const revoked = await db
        .update(platformSyncApiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(platformSyncApiKeys.guid, c.req.param("guid")),
            isNull(platformSyncApiKeys.revokedAt),
          ),
        )
        .returning({ id: platformSyncApiKeys.id });
      return c.json(
        revoked.length === 0
          ? { success: false, message: "API key not found." }
          : { success: true, message: "API key revoked." },
      );
    },
  );
