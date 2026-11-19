import type { STATS_SYNC_ERROR_CODES } from "../constants/stats-sync.constant";

export type StatsSyncErrorCode = (typeof STATS_SYNC_ERROR_CODES)[number];

export interface StatsSyncDay {
  day: string;
  scanCount: number;
  matchedCount: number;
  unmatchedCount: number;
  correctedCount: number;
}

export interface StatsSyncPushBody {
  days: StatsSyncDay[];
}

export interface StatsSyncPushResult {
  syncedDayCount: number;
  totalSyncedScanCount: number;
}

export interface StatsSyncKey {
  keyPrefix: string;
  createdBy: string;
  createdAt: string;
  lastSyncedAt: string | null;
}

export interface StatsSyncKeyStatus {
  key: StatsSyncKey | null;
  syncedScanCount: number;
  canManage: boolean;
}

export interface CreatedStatsSyncKey {
  status: StatsSyncKeyStatus;
  rawKey: string;
}

export interface StatsSyncConnection {
  keyPrefix: string;
  connectedAt: string;
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  lastErrorCode: StatsSyncErrorCode | null;
  syncedScanCount: number | null;
}

export interface StatsSyncConnectionStatus {
  connection: StatsSyncConnection | null;
  targetUrl: string;
  canManage: boolean;
}

export interface StatsSyncConnectInput {
  syncKey: string;
}
