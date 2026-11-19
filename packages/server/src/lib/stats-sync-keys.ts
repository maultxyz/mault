import {
  STATS_SYNC_KEY_PREFIX,
  type StatsSyncDay,
  type StatsSyncKeyStatus,
  type StatsSyncPushResult,
} from "@magic-vault/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, type Transaction } from "../db";
import { selfHostedDailyScanStats, statsSyncKeys } from "../db/schema";
import { getUserDisplayName } from "../middleware/auth";
import { generateApiKey } from "./api-keys";
import type { ResolvedStatsSyncKey } from "./interfaces/stats-sync";

async function sumSelfHostedScans(
  executor: Transaction | typeof db,
  orgId: string,
): Promise<number> {
  const [row] = await executor
    .select({
      total: sql<string>`coalesce(sum(${selfHostedDailyScanStats.scanCount}), 0)`,
    })
    .from(selfHostedDailyScanStats)
    .where(eq(selfHostedDailyScanStats.orgId, orgId));
  return Number(row?.total ?? 0);
}

export async function loadStatsSyncKeyStatus(
  tx: Transaction,
  orgId: string,
  canManage: boolean,
): Promise<StatsSyncKeyStatus> {
  const [key] = await tx
    .select({
      keyPrefix: statsSyncKeys.keyPrefix,
      createdBy: statsSyncKeys.createdBy,
      createdAt: statsSyncKeys.createdAt,
      lastSyncedAt: statsSyncKeys.lastSyncedAt,
    })
    .from(statsSyncKeys)
    .where(and(eq(statsSyncKeys.orgId, orgId), isNull(statsSyncKeys.revokedAt)))
    .limit(1);
  const syncedScanCount = await sumSelfHostedScans(tx, orgId);
  return {
    key: key
      ? {
          keyPrefix: key.keyPrefix,
          createdBy: await getUserDisplayName(key.createdBy),
          createdAt: key.createdAt.toISOString(),
          lastSyncedAt: key.lastSyncedAt?.toISOString() ?? null,
        }
      : null,
    syncedScanCount,
    canManage,
  };
}

export async function revokeStatsSyncKey(
  tx: Transaction,
  orgId: string,
): Promise<void> {
  await tx
    .update(statsSyncKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(statsSyncKeys.orgId, orgId), isNull(statsSyncKeys.revokedAt)));
}

export async function generateStatsSyncKey(
  tx: Transaction,
  orgId: string,
  userId: string,
): Promise<string> {
  await revokeStatsSyncKey(tx, orgId);
  const { rawKey, keyPrefix, keyHash } = generateApiKey(STATS_SYNC_KEY_PREFIX);
  await tx
    .insert(statsSyncKeys)
    .values({ orgId, keyPrefix, keyHash, createdBy: userId });
  return rawKey;
}

export async function resolveStatsSyncKey(
  keyHash: string,
): Promise<ResolvedStatsSyncKey | null> {
  const [key] = await db
    .select({ id: statsSyncKeys.id, orgId: statsSyncKeys.orgId })
    .from(statsSyncKeys)
    .where(and(eq(statsSyncKeys.keyHash, keyHash), isNull(statsSyncKeys.revokedAt)))
    .limit(1);
  return key ?? null;
}

export async function storeSelfHostedScanDays(
  key: ResolvedStatsSyncKey,
  days: StatsSyncDay[],
): Promise<StatsSyncPushResult> {
  return db.transaction(async (tx) => {
    const now = new Date();
    if (days.length) {
      await tx
        .insert(selfHostedDailyScanStats)
        .values(days.map((day) => ({ orgId: key.orgId, ...day, updatedAt: now })))
        .onConflictDoUpdate({
          target: [selfHostedDailyScanStats.orgId, selfHostedDailyScanStats.day],
          set: {
            scanCount: sql`excluded.scan_count`,
            matchedCount: sql`excluded.matched_count`,
            unmatchedCount: sql`excluded.unmatched_count`,
            correctedCount: sql`excluded.corrected_count`,
            updatedAt: now,
          },
        });
    }
    await tx
      .update(statsSyncKeys)
      .set({ lastSyncedAt: now })
      .where(eq(statsSyncKeys.id, key.id));
    return {
      syncedDayCount: days.length,
      totalSyncedScanCount: await sumSelfHostedScans(tx, key.orgId),
    };
  });
}
