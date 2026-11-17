import type { SyncApiKey } from "@magic-vault/shared";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "../db";
import { platformSyncApiKeys } from "../db/schema";
import { getUserDisplayName } from "../middleware/auth";
import { API_KEY_LAST_USED_THROTTLE_MS } from "./constants/api-keys";
import { SYNC_API_KEY_COLUMNS } from "./constants/sync-api-keys";
import type {
  ResolvedSyncApiKey,
  SyncApiKeyRow,
} from "./interfaces/sync-api-keys";
import { toSyncApiKeyPermissions } from "./sync-api-key-permissions";

export async function toSyncApiKey(row: SyncApiKeyRow): Promise<SyncApiKey> {
  return {
    guid: row.guid,
    name: row.name,
    keyPrefix: row.keyPrefix,
    permissions: toSyncApiKeyPermissions(row.permissions),
    createdBy: await getUserDisplayName(row.createdBy),
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

export async function loadSyncApiKeys(): Promise<SyncApiKey[]> {
  const rows = await db
    .select(SYNC_API_KEY_COLUMNS)
    .from(platformSyncApiKeys)
    .where(isNull(platformSyncApiKeys.revokedAt))
    .orderBy(desc(platformSyncApiKeys.createdAt));
  return Promise.all(rows.map(toSyncApiKey));
}

export async function resolveSyncApiKey(
  keyHash: string,
): Promise<ResolvedSyncApiKey | null> {
  const [key] = await db
    .select({
      id: platformSyncApiKeys.id,
      guid: platformSyncApiKeys.guid,
      name: platformSyncApiKeys.name,
      permissions: platformSyncApiKeys.permissions,
    })
    .from(platformSyncApiKeys)
    .where(
      and(
        eq(platformSyncApiKeys.keyHash, keyHash),
        isNull(platformSyncApiKeys.revokedAt),
      ),
    )
    .limit(1);
  if (!key) return null;
  const now = new Date();
  await db
    .update(platformSyncApiKeys)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(platformSyncApiKeys.id, key.id),
        or(
          isNull(platformSyncApiKeys.lastUsedAt),
          lt(
            platformSyncApiKeys.lastUsedAt,
            new Date(now.getTime() - API_KEY_LAST_USED_THROTTLE_MS),
          ),
        ),
      ),
    );
  return {
    guid: key.guid,
    name: key.name,
    permissions: toSyncApiKeyPermissions(key.permissions),
  };
}
