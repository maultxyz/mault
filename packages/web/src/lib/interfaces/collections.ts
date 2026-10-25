import type {
  MonitorLinkInfo,
  Collection,
  DeployNotice,
  SyncState,
} from "@magic-vault/shared";
import type { ReactElement } from "react";
import type { CreateCollectionFormValues } from "@/schemas/collections.schema";

export interface ScanLockInfo {
  userId: string;
  displayName: string;
  expiresAt: number;
}

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
  createCollection: (values: CreateCollectionFormValues) => Promise<void>;
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

export interface CollectionPreviewStackProps {
  images: string[];
}

export interface CollectionTarget {
  guid: string;
  name: string;
}

export interface EmptyCollectionDialogProps {
  targets: CollectionTarget[];
  onOpenChange: (open: boolean) => void;
  onChooseDelete: () => void;
}

export interface CollectionTileProps {
  collection: Collection;
  isActive: boolean;
  isActivating: boolean;
  isMutating: boolean;
  scannerLock?: ScanLockInfo;
  isOwnSession: boolean;
  watchers: SessionViewer[];
  isSelected: boolean;
  onToggleSelect: (shiftKey: boolean) => void;
  onActivate: () => void;
  onEdit: () => void;
  onEmpty: () => void;
  onDelete: () => void;
}

export interface ScanningPillProps {
  isOwn?: boolean;
}

export interface ReleaseSessionButtonProps {
  guid: string;
}
