import type { ScanLockInfo } from "@magic-vault/shared";

export type ScanLock = ScanLockInfo;

export interface AcquireLockResult {
  ok: boolean;
  isNewSession: boolean;
}

export interface LockEntry extends ScanLock {
  orgId: string;
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
}

export interface ActiveScanLock {
  collectionGuid: string;
  userId: string;
  displayName: string;
  orgId: string;
  startedAt: number;
  expiresAt: number;
}
