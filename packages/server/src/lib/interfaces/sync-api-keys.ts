import type { SyncApiKeyPermission } from "@magic-vault/shared";

export interface SyncApiKeyVariables {
  syncApiKeyGuid: string;
  syncApiKeyName: string;
  syncApiKeyPermissions: SyncApiKeyPermission[];
}

export type SyncApiKeyEnv = { Variables: SyncApiKeyVariables };

export interface SyncApiKeyRow {
  guid: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdBy: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface ResolvedSyncApiKey {
  guid: string;
  name: string;
  permissions: SyncApiKeyPermission[];
}
