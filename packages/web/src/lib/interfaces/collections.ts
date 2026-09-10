export interface ScanLockInfo {
  userId: string;
  displayName: string;
  expiresAt: number;
}

// A person currently viewing/watching a live scan session — the same shape
// was previously duplicated across the live-count, session-monitor, and
// watcher-stack UI.
export interface SessionViewer {
  userId: string;
  displayName: string;
}
