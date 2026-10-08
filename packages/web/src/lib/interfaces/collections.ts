import type {
  MonitorLinkInfo,
  Collection,
  DeployNotice,
  SyncState,
} from "@magic-vault/shared";
import type { ReactElement } from "react";

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

export interface CollectionsContextValue {
  collections: Collection[];
  activeCollection: Collection | null;
  isLoading: boolean;
  isActivating: boolean;
  isMutating: boolean;
  createCollection: (name: string, gameGuid: string, lang: string) => Promise<void>;
  updateCollection: (guid: string, name: string) => Promise<void>;
  activateCollection: (guid: string) => Promise<void>;
  deleteCollection: (guid: string) => Promise<void>;
  emptyCollection: (guid: string) => Promise<void>;
}

export interface CreateCollectionDialogProps {
  trigger: (ctx: { disabled: boolean; noGames: boolean }) => ReactElement;
}

export interface AppStreamContextValue {
  eventSource: EventSource | null;
  locks: Record<string, ScanLockInfo>;
  currentUserId: string | undefined;
  liveCounts: Record<string, number>;
  viewersByGuid: Record<string, SessionViewer[]>;
  syncState: SyncState;
  deployNotice: DeployNotice | null;
  watchCollection: (guid: string) => () => void;
}
