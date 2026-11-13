import { inArray, lt, sql } from "drizzle-orm";
import { db, pool } from "../db";
import {
  apiKeyUsageDaily,
  orgApiKeys,
  publicRouteUsageDaily,
} from "../db/schema";
import {
  API_USAGE_FLUSH_INTERVAL_MS,
  API_USAGE_RETENTION_DAYS,
} from "./constants/api-keys";
import { ONE_DAY_MS } from "./constants/timing";
import { usageEndpointOf } from "./public-api/usage-endpoint";
import type {
  PendingApiKeyUsage,
  PendingPublicRouteUsage,
} from "./interfaces/api-usage";

let pendingApiKeyUsage = new Map<string, PendingApiKeyUsage>();
let pendingPublicRouteUsage = new Map<string, PendingPublicRouteUsage>();
let lastPrunedDay: string | null = null;

function usageDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function addToPending<T extends PendingApiKeyUsage | PendingPublicRouteUsage>(
  pending: Map<string, T>,
  key: string,
  createEntry: () => T,
  isRateLimited: boolean,
  at: Date,
): void {
  const entry = pending.get(key) ?? createEntry();
  entry.requestCount += 1;
  if (isRateLimited) entry.rateLimitedCount += 1;
  if (entry.lastRequestAt < at) entry.lastRequestAt = at;
  pending.set(key, entry);
}

export function recordApiKeyUsage(
  keyHash: string,
  method: string,
  path: string,
  isRateLimited: boolean,
): void {
  const at = new Date();
  const endpoint = usageEndpointOf(method, path);
  const day = usageDay(at);
  addToPending(
    pendingApiKeyUsage,
    `${keyHash}\u0000${endpoint}\u0000${day}`,
    () => ({ keyHash, endpoint, day, requestCount: 0, rateLimitedCount: 0, lastRequestAt: at }),
    isRateLimited,
    at,
  );
}

export function recordPublicRouteUsage(
  endpoint: string,
  isRateLimited: boolean,
): void {
  const at = new Date();
  const day = usageDay(at);
  addToPending(
    pendingPublicRouteUsage,
    `${endpoint}\u0000${day}`,
    () => ({ endpoint, day, requestCount: 0, rateLimitedCount: 0, lastRequestAt: at }),
    isRateLimited,
    at,
  );
}

function restorePending<T extends PendingApiKeyUsage | PendingPublicRouteUsage>(
  pending: Map<string, T>,
  failed: Map<string, T>,
): void {
  for (const [key, entry] of failed) {
    const current = pending.get(key);
    if (!current) {
      pending.set(key, entry);
      continue;
    }
    current.requestCount += entry.requestCount;
    current.rateLimitedCount += entry.rateLimitedCount;
    if (current.lastRequestAt < entry.lastRequestAt) {
      current.lastRequestAt = entry.lastRequestAt;
    }
  }
}

async function writeApiKeyUsage(
  usage: Map<string, PendingApiKeyUsage>,
): Promise<void> {
  if (usage.size === 0) return;
  const entries = [...usage.values()];
  const keys = await db
    .select({
      id: orgApiKeys.id,
      orgId: orgApiKeys.orgId,
      keyHash: orgApiKeys.keyHash,
    })
    .from(orgApiKeys)
    .where(
      inArray(orgApiKeys.keyHash, [...new Set(entries.map((entry) => entry.keyHash))]),
    );
  const keysByHash = new Map(keys.map((key) => [key.keyHash, key]));
  const rows = entries.flatMap((entry) => {
    const key = keysByHash.get(entry.keyHash);
    return key
      ? [
          {
            apiKeyId: key.id,
            orgId: key.orgId,
            endpoint: entry.endpoint,
            day: entry.day,
            requestCount: entry.requestCount,
            rateLimitedCount: entry.rateLimitedCount,
            lastRequestAt: entry.lastRequestAt,
          },
        ]
      : [];
  });
  if (rows.length === 0) return;
  await db
    .insert(apiKeyUsageDaily)
    .values(rows)
    .onConflictDoUpdate({
      target: [
        apiKeyUsageDaily.apiKeyId,
        apiKeyUsageDaily.endpoint,
        apiKeyUsageDaily.day,
      ],
      set: {
        requestCount: sql`${apiKeyUsageDaily.requestCount} + excluded.request_count`,
        rateLimitedCount: sql`${apiKeyUsageDaily.rateLimitedCount} + excluded.rate_limited_count`,
        lastRequestAt: sql`greatest(${apiKeyUsageDaily.lastRequestAt}, excluded.last_request_at)`,
      },
    });
}

async function writePublicRouteUsage(
  usage: Map<string, PendingPublicRouteUsage>,
): Promise<void> {
  if (usage.size === 0) return;
  await db
    .insert(publicRouteUsageDaily)
    .values([...usage.values()])
    .onConflictDoUpdate({
      target: [publicRouteUsageDaily.endpoint, publicRouteUsageDaily.day],
      set: {
        requestCount: sql`${publicRouteUsageDaily.requestCount} + excluded.request_count`,
        rateLimitedCount: sql`${publicRouteUsageDaily.rateLimitedCount} + excluded.rate_limited_count`,
        lastRequestAt: sql`greatest(${publicRouteUsageDaily.lastRequestAt}, excluded.last_request_at)`,
      },
    });
}

async function pruneOldUsage(): Promise<void> {
  const today = usageDay(new Date());
  if (lastPrunedDay === today) return;
  const oldestKeptDay = usageDay(
    new Date(Date.now() - API_USAGE_RETENTION_DAYS * ONE_DAY_MS),
  );
  await db.delete(apiKeyUsageDaily).where(lt(apiKeyUsageDaily.day, oldestKeptDay));
  await db
    .delete(publicRouteUsageDaily)
    .where(lt(publicRouteUsageDaily.day, oldestKeptDay));
  lastPrunedDay = today;
}

export async function flushApiUsage(): Promise<void> {
  const apiKeyUsage = pendingApiKeyUsage;
  const publicRouteUsage = pendingPublicRouteUsage;
  if (apiKeyUsage.size === 0 && publicRouteUsage.size === 0) return;
  pendingApiKeyUsage = new Map();
  pendingPublicRouteUsage = new Map();
  try {
    await writeApiKeyUsage(apiKeyUsage);
  } catch (error) {
    restorePending(pendingApiKeyUsage, apiKeyUsage);
    restorePending(pendingPublicRouteUsage, publicRouteUsage);
    throw error;
  }
  try {
    await writePublicRouteUsage(publicRouteUsage);
  } catch (error) {
    restorePending(pendingPublicRouteUsage, publicRouteUsage);
    throw error;
  }
  await pruneOldUsage();
}

export function startApiUsageFlushing(): void {
  setInterval(() => {
    if (pool.totalCount === 0) return;
    flushApiUsage().catch((error: unknown) =>
      console.error("[api-usage] Flushing usage counts failed:", error),
    );
  }, API_USAGE_FLUSH_INTERVAL_MS).unref();
}
