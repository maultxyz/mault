export interface ApiKeyUsageRow {
  orgId: string;
  orgName: string | null;
  apiKeyName: string;
  apiKeyPrefix: string;
  isApiKeyRevoked: boolean;
  endpoint: string;
  requestCount: number;
  rateLimitedCount: number;
  lastRequestAt: string;
}

export interface PublicRouteUsageRow {
  endpoint: string;
  requestCount: number;
  rateLimitedCount: number;
  lastRequestAt: string;
}

export interface ApiUsageReport {
  days: number;
  apiKeys: ApiKeyUsageRow[];
  publicRoutes: PublicRouteUsageRow[];
}
