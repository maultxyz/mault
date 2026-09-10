export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  status: "active" | "revoked";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface SessionRow {
  id: string;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}
