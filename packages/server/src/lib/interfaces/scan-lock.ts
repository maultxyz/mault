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
  timer: ReturnType<typeof setTimeout>;
}
