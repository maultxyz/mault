import {
  PUBLIC_API_KEY_HEADER,
  SYNC_API_KEY_PREFIX,
  type SyncApiKeyPermission,
} from "@magic-vault/shared";
import { createMiddleware } from "hono/factory";
import { hashApiKey } from "../lib/api-keys";
import {
  SYNC_API_KEY_INVALID_MESSAGE,
  SYNC_API_KEY_PERMISSION_DENIED_MESSAGES,
  SYNC_API_KEY_RATE_LIMITED_MESSAGE,
} from "../lib/constants/sync-api-keys";
import type { SyncApiKeyEnv } from "../lib/interfaces/sync-api-keys";
import { consumeRateLimit } from "../lib/public-api/rate-limit";
import { resolveSyncApiKey } from "../lib/sync-api-keys";
import { hasSyncApiKeyPermission } from "../lib/sync-api-key-permissions";

export const requireSyncApiKey = createMiddleware<SyncApiKeyEnv>(
  async (c, next) => {
    const token = c.req.header(PUBLIC_API_KEY_HEADER)?.trim() ?? "";
    if (!token.startsWith(SYNC_API_KEY_PREFIX)) {
      return c.json({ success: false, message: SYNC_API_KEY_INVALID_MESSAGE }, 401);
    }
    const keyHash = hashApiKey(token);
    const rate = consumeRateLimit(keyHash);
    if (!rate.allowed) {
      c.header(
        "Retry-After",
        String(Math.max(Math.ceil((rate.resetAt - Date.now()) / 1000), 0)),
      );
      return c.json(
        { success: false, message: SYNC_API_KEY_RATE_LIMITED_MESSAGE },
        429,
      );
    }
    const key = await resolveSyncApiKey(keyHash);
    if (!key) {
      return c.json({ success: false, message: SYNC_API_KEY_INVALID_MESSAGE }, 401);
    }
    c.set("syncApiKeyGuid", key.guid);
    c.set("syncApiKeyName", key.name);
    c.set("syncApiKeyPermissions", key.permissions);
    await next();
  },
);

export function requireSyncApiKeyPermission(
  requiredPermission: SyncApiKeyPermission,
) {
  return createMiddleware<SyncApiKeyEnv>(async (c, next) => {
    if (
      !hasSyncApiKeyPermission(
        c.get("syncApiKeyPermissions"),
        requiredPermission,
      )
    ) {
      return c.json(
        {
          success: false,
          message: SYNC_API_KEY_PERMISSION_DENIED_MESSAGES[requiredPermission],
        },
        403,
      );
    }
    await next();
  });
}
