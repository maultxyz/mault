export interface PendingUsageCount {
  requestCount: number;
  rateLimitedCount: number;
  lastRequestAt: Date;
}

export interface PendingApiKeyUsage extends PendingUsageCount {
  keyHash: string;
  endpoint: string;
  day: string;
}

export interface PendingPublicRouteUsage extends PendingUsageCount {
  endpoint: string;
  day: string;
}
