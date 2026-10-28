import type { SyncApiKeyPermission } from "@magic-vault/shared";
import { platformSyncApiKeys } from "../../db/schema";

export const SYNC_API_KEY_COLUMNS = {
  guid: platformSyncApiKeys.guid,
  name: platformSyncApiKeys.name,
  keyPrefix: platformSyncApiKeys.keyPrefix,
  permissions: platformSyncApiKeys.permissions,
  createdBy: platformSyncApiKeys.createdBy,
  createdAt: platformSyncApiKeys.createdAt,
  lastUsedAt: platformSyncApiKeys.lastUsedAt,
};

export const SYNC_API_KEY_INVALID_MESSAGE = "Missing or invalid sync API key.";
export const SYNC_API_KEY_RATE_LIMITED_MESSAGE =
  "Too many requests. Slow down and retry.";

export const SYNC_API_KEY_PERMISSION_DENIED_MESSAGES: Record<
  SyncApiKeyPermission,
  string
> = {
  sync_start: "This API key is not allowed to start a sync.",
  sync_force: "This API key is not allowed to start a force resync.",
  sync_card: "This API key is not allowed to sync single cards.",
  sync_cancel: "This API key is not allowed to cancel a sync.",
};
