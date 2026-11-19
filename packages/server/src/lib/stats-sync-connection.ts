import {
  PUBLIC_API_KEY_HEADER,
  STATS_SYNC_EARLIEST_DAY,
  STATS_SYNC_ERROR_CODES,
  STATS_SYNC_MAX_DAYS_PER_REQUEST,
  STATS_SYNC_MAX_SCANS_PER_DAY,
  STATS_SYNC_PUSH_PATH,
  type StatsSyncConnectionStatus,
  type StatsSyncDay,
  type StatsSyncErrorCode,
  type StatsSyncPushResult,
  type Result,
} from "@magic-vault/shared";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { scanStats, statsSyncConnections } from "../db/schema";
import {
  STATS_SYNC_DEFAULT_TARGET_URL,
  STATS_SYNC_INTERVAL_MS,
  STATS_SYNC_REQUEST_TIMEOUT_MS,
  STATS_SYNC_RESEND_RECENT_DAYS,
  STATS_SYNC_RETRY_AFTER_FAILURE_MS,
  STATS_SYNC_SCHEDULE_CHECK_INTERVAL_MS,
  STATS_SYNC_SCHEDULE_STARTUP_DELAY_MS,
  STATS_SYNC_USER_AGENT,
} from "./constants/stats-sync";
import { SCAN_OUTCOME_MATCHED, SCAN_OUTCOME_UNMATCHED } from "./constants/scan-stats";
import type {
  ScheduledStatsSyncConnection,
  StatsSyncRunOutcome,
} from "./interfaces/stats-sync";

const scheduledConnections = new Map<string, ScheduledStatsSyncConnection>();
const runningSyncs = new Map<string, Promise<StatsSyncRunOutcome>>();

export function statsSyncTargetUrl(): string {
  return (process.env.STATS_SYNC_TARGET_URL || STATS_SYNC_DEFAULT_TARGET_URL).replace(/\/+$/, "");
}

function toErrorCode(value: string | null): StatsSyncErrorCode | null {
  return (STATS_SYNC_ERROR_CODES as readonly string[]).includes(value ?? "")
    ? (value as StatsSyncErrorCode)
    : null;
}

export async function loadStatsSyncConnectionStatus(
  orgId: string,
  canManage: boolean,
): Promise<StatsSyncConnectionStatus> {
  const [row] = await db
    .select()
    .from(statsSyncConnections)
    .where(eq(statsSyncConnections.orgId, orgId))
    .limit(1);
  return {
    connection: row
      ? {
          keyPrefix: row.keyPrefix,
          connectedAt: row.connectedAt.toISOString(),
          lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
          lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
          lastErrorCode: toErrorCode(row.lastErrorCode),
          syncedScanCount: row.syncedScanCount,
        }
      : null,
    targetUrl: statsSyncTargetUrl(),
    canManage,
  };
}

export async function collectDailyScanTotals(
  orgId: string,
  since: Date | null,
): Promise<StatsSyncDay[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(${scanStats.scannedAt}, 'YYYY-MM-DD')`,
      matchedCount: sql<number>`count(*) filter (where ${scanStats.outcome} = ${SCAN_OUTCOME_MATCHED})::int`,
      unmatchedCount: sql<number>`count(*) filter (where ${scanStats.outcome} = ${SCAN_OUTCOME_UNMATCHED})::int`,
      correctedCount: sql<number>`count(*) filter (where ${scanStats.isCorrected})::int`,
    })
    .from(scanStats)
    .where(
      and(
        eq(scanStats.orgId, orgId),
        inArray(scanStats.outcome, [SCAN_OUTCOME_MATCHED, SCAN_OUTCOME_UNMATCHED]),
        gte(scanStats.scannedAt, since ?? new Date(`${STATS_SYNC_EARLIEST_DAY}T00:00:00Z`)),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows.map((row) => {
    const matchedCount = Math.min(row.matchedCount, STATS_SYNC_MAX_SCANS_PER_DAY);
    const unmatchedCount = Math.min(row.unmatchedCount, STATS_SYNC_MAX_SCANS_PER_DAY - matchedCount);
    const scanCount = matchedCount + unmatchedCount;
    return {
      day: row.day,
      scanCount,
      matchedCount,
      unmatchedCount,
      correctedCount: Math.min(row.correctedCount, scanCount),
    };
  });
}

async function pushDays(
  syncKey: string,
  days: StatsSyncDay[],
): Promise<{ result: StatsSyncPushResult } | { errorCode: StatsSyncErrorCode }> {
  let response: Response;
  try {
    response = await fetch(`${statsSyncTargetUrl()}${STATS_SYNC_PUSH_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": STATS_SYNC_USER_AGENT,
        [PUBLIC_API_KEY_HEADER]: syncKey,
      },
      body: JSON.stringify({ days }),
      redirect: "error",
      signal: AbortSignal.timeout(STATS_SYNC_REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[stats-sync] Main instance unreachable:", err);
    return { errorCode: "unreachable" };
  }
  if (response.status === 401) return { errorCode: "invalidKey" };
  const body = (await response.json().catch(() => null)) as Result<StatsSyncPushResult> | null;
  if (!response.ok || !body?.success || !body.data) {
    console.error("[stats-sync] Main instance rejected push:", response.status, body?.message);
    return { errorCode: response.status >= 500 || response.status === 429 ? "unreachable" : "rejected" };
  }
  return { result: body.data };
}

function sinceForResend(lastSyncedAt: Date | null): Date | null {
  if (!lastSyncedAt) return null;
  const since = new Date(lastSyncedAt);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - STATS_SYNC_RESEND_RECENT_DAYS);
  return since;
}

async function pushAllDays(
  syncKey: string,
  days: StatsSyncDay[],
): Promise<StatsSyncRunOutcome> {
  let totalSyncedScanCount = 0;
  const batchCount = Math.max(1, Math.ceil(days.length / STATS_SYNC_MAX_DAYS_PER_REQUEST));
  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    const batch = days.slice(
      batchIndex * STATS_SYNC_MAX_DAYS_PER_REQUEST,
      (batchIndex + 1) * STATS_SYNC_MAX_DAYS_PER_REQUEST,
    );
    const pushed = await pushDays(syncKey, batch);
    if ("errorCode" in pushed) return { kind: "failed", errorCode: pushed.errorCode };
    totalSyncedScanCount = pushed.result.totalSyncedScanCount;
  }
  return { kind: "synced", totalSyncedScanCount };
}

async function runStatsSyncNow(orgId: string): Promise<StatsSyncRunOutcome> {
  const [connection] = await db
    .select()
    .from(statsSyncConnections)
    .where(eq(statsSyncConnections.orgId, orgId))
    .limit(1);
  if (!connection) {
    scheduledConnections.delete(orgId);
    return { kind: "notConnected" };
  }
  const attemptedAt = new Date();
  const days = await collectDailyScanTotals(orgId, sinceForResend(connection.lastSyncedAt));
  const outcome = await pushAllDays(connection.syncKey, days);
  const update =
    outcome.kind === "synced"
      ? {
          lastAttemptAt: attemptedAt,
          lastSyncedAt: attemptedAt,
          lastErrorCode: null,
          syncedScanCount: outcome.totalSyncedScanCount,
        }
      : {
          lastAttemptAt: attemptedAt,
          lastErrorCode: outcome.kind === "failed" ? outcome.errorCode : null,
        };
  const [updated] = await db
    .update(statsSyncConnections)
    .set(update)
    .where(
      and(
        eq(statsSyncConnections.orgId, orgId),
        eq(statsSyncConnections.syncKey, connection.syncKey),
      ),
    )
    .returning({
      lastSyncedAt: statsSyncConnections.lastSyncedAt,
      lastErrorCode: statsSyncConnections.lastErrorCode,
    });
  if (updated) {
    scheduledConnections.set(orgId, {
      lastSyncedAt: updated.lastSyncedAt?.getTime() ?? null,
      lastAttemptAt: attemptedAt.getTime(),
      lastErrorCode: toErrorCode(updated.lastErrorCode),
    });
  }
  return outcome;
}

export function runStatsSync(orgId: string): Promise<StatsSyncRunOutcome> {
  const running = runningSyncs.get(orgId);
  if (running) return running;
  const run = runStatsSyncNow(orgId).finally(() => runningSyncs.delete(orgId));
  runningSyncs.set(orgId, run);
  return run;
}

export async function connectStatsSync(
  orgId: string,
  userId: string,
  syncKey: string,
  keyPrefix: string,
): Promise<StatsSyncRunOutcome> {
  await runningSyncs.get(orgId)?.catch(() => null);
  const values = {
    syncKey,
    keyPrefix,
    connectedBy: userId,
    connectedAt: new Date(),
    lastSyncedAt: null,
    lastAttemptAt: null,
    lastErrorCode: null,
    syncedScanCount: null,
  };
  await db
    .insert(statsSyncConnections)
    .values({ orgId, ...values })
    .onConflictDoUpdate({ target: statsSyncConnections.orgId, set: values });
  scheduledConnections.set(orgId, { lastSyncedAt: null, lastAttemptAt: null, lastErrorCode: null });
  const outcome = await runStatsSync(orgId);
  if (outcome.kind === "failed" && outcome.errorCode === "invalidKey") {
    await disconnectStatsSync(orgId);
  }
  return outcome;
}

export async function disconnectStatsSync(orgId: string): Promise<void> {
  scheduledConnections.delete(orgId);
  await db.delete(statsSyncConnections).where(eq(statsSyncConnections.orgId, orgId));
}

function isDue(connection: ScheduledStatsSyncConnection, now: number): boolean {
  if (connection.lastErrorCode === "invalidKey") return false;
  if (connection.lastSyncedAt !== null && now - connection.lastSyncedAt < STATS_SYNC_INTERVAL_MS) {
    return false;
  }
  return (
    connection.lastAttemptAt === null ||
    now - connection.lastAttemptAt >= STATS_SYNC_RETRY_AFTER_FAILURE_MS
  );
}

async function runDueStatsSyncs(): Promise<void> {
  const now = Date.now();
  const dueOrgIds = [...scheduledConnections]
    .filter(([, connection]) => isDue(connection, now))
    .map(([orgId]) => orgId);
  for (const orgId of dueOrgIds) {
    try {
      await runStatsSync(orgId);
    } catch (err) {
      console.error("[stats-sync] Scheduled sync failed for org", orgId, err);
    }
  }
}

async function loadScheduledConnections(): Promise<void> {
  const rows = await db
    .select({
      orgId: statsSyncConnections.orgId,
      lastSyncedAt: statsSyncConnections.lastSyncedAt,
      lastAttemptAt: statsSyncConnections.lastAttemptAt,
      lastErrorCode: statsSyncConnections.lastErrorCode,
    })
    .from(statsSyncConnections);
  for (const row of rows) {
    scheduledConnections.set(row.orgId, {
      lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
      lastAttemptAt: row.lastAttemptAt?.getTime() ?? null,
      lastErrorCode: toErrorCode(row.lastErrorCode),
    });
  }
}

export function startStatsSyncSchedule(): void {
  if (process.env.AUTH_PROVIDER !== "local") return;
  setTimeout(() => {
    loadScheduledConnections()
      .then(runDueStatsSyncs)
      .catch((err) => console.error("[stats-sync] Failed to load connections:", err));
    setInterval(() => void runDueStatsSyncs(), STATS_SYNC_SCHEDULE_CHECK_INTERVAL_MS).unref();
  }, STATS_SYNC_SCHEDULE_STARTUP_DELAY_MS).unref();
}
