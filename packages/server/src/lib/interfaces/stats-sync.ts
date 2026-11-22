import type { StatsSyncErrorCode } from "@magic-vault/shared";

export interface ResolvedStatsSyncKey {
  id: number;
  orgId: string;
}

export interface ScheduledStatsSyncConnection {
  lastSyncedAt: number | null;
  lastAttemptAt: number | null;
  lastErrorCode: StatsSyncErrorCode | null;
}

export type StatsSyncRunOutcome =
  | { kind: "synced"; totalSyncedScanCount: number }
  | { kind: "failed"; errorCode: StatsSyncErrorCode }
  | { kind: "notConnected" };
