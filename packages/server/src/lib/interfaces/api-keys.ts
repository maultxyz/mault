import type { ApiKeyScope } from "@magic-vault/shared";

export interface ApiKeyVariables {
  orgId: string;
  apiKeyGuid: string;
  apiKeyScope: ApiKeyScope;
}

export type ApiKeyEnv = { Variables: ApiKeyVariables };

export interface GeneratedApiKey {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}

export interface ResolvedApiKey {
  guid: string;
  orgId: string;
  scope: ApiKeyScope;
  apiAccessAllowed: boolean;
}

export interface OrgApiKeyRow {
  guid: string;
  name: string;
  keyPrefix: string;
  scope: string;
  createdBy: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}
