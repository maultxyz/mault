export interface ScanLock {
  userId: string;
  displayName: string;
  expiresAt: number;
}

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
