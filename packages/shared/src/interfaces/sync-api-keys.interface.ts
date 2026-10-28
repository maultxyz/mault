import type { SYNC_API_KEY_PERMISSIONS } from "../constants/sync-api-keys.constant";

export type SyncApiKeyPermission = (typeof SYNC_API_KEY_PERMISSIONS)[number];

export interface SyncApiKey {
  guid: string;
  name: string;
  keyPrefix: string;
  permissions: SyncApiKeyPermission[];
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface SyncApiKeyInput {
  name: string;
  permissions: SyncApiKeyPermission[];
}

export interface CreatedSyncApiKey {
  apiKey: SyncApiKey;
  rawKey: string;
}
