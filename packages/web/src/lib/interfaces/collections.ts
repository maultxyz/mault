import type { MonitorLinkInfo } from "@magic-vault/shared";

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

export interface ShareMonitorLinkDialogProps {
  collectionGuid: string;
}

export interface CreatedMonitorLink {
  url: string;
  expiresAt: string;
}

export type WatchLinkState =
  | { status: "checking" }
  | { status: "invalid" }
  | { status: "valid"; info: MonitorLinkInfo };
