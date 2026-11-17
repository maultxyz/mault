import type { ScanLockInfo } from "@magic-vault/shared";
import type { CollectionChangeSummary, LibraryValueMode } from "@/lib/interfaces/library";
import type {
  CreateCollectionFormValues,
  EditCollectionFormValues,
  MonitorLinkInfo,
  Collection,
} from "@magic-vault/shared";
import type { ReactElement } from "react";

export type { ScanLockInfo };

export interface SessionViewer {
  userId: string;
  displayName: string;
}

export interface ShareMonitorLinkDialogProps {
  collectionGuid: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  startsWithNewTradeLink?: boolean;
}

export type WatchLinkState =
  | { status: "checking" }
  | { status: "invalid" }
  | { status: "failed" }
  | { status: "valid"; info: MonitorLinkInfo };

export interface CollectionsContextValue {
  collections: Collection[];
  activeCollection: Collection | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  isActivating: boolean;
  isMutating: boolean;
  createCollection: (values: CreateCollectionFormValues) => Promise<boolean>;
  updateCollection: (
    guid: string,
    values: EditCollectionFormValues,
  ) => Promise<void>;
  activateCollection: (guid: string) => Promise<void>;
  deleteCollection: (guid: string) => Promise<boolean>;
  emptyCollection: (guid: string) => Promise<boolean>;
}

export interface CreateCollectionDialogProps {
  trigger?: (ctx: { disabled: boolean; noGames: boolean }) => ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface EditCollectionDialogProps {
  collection: Collection | null;
  onClose: () => void;
}

export interface ActiveCollectionSessionActions {
  isLockedByMe: boolean;
  isSharing: boolean;
  isReleasing: boolean;
  copyMonitorLink: () => Promise<void>;
  releaseScanSession: () => Promise<void>;
}

export interface AppStreamSourceContextValue {
  eventSource: EventSource | null;
  watchCollection: (guid: string) => () => void;
}

export interface CollectionLocksContextValue {
  locks: Record<string, ScanLockInfo>;
  currentUserId: string | undefined;
}

export interface CollectionPreviewStackProps {
  images: string[];
}

export interface CollectionTarget {
  guid: string;
  name: string;
}

export interface MobileCollectionActionsMenuProps {
  collectionGuid: string;
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
  valueMode: LibraryValueMode;
  change: CollectionChangeSummary | null;
}

export interface ScanningPillProps {
  isOwn?: boolean;
}

export interface ReleaseSessionButtonProps {
  guid: string;
}

export interface CollectionGameBadgeProps {
  collection: Pick<Collection, "game" | "lang">;
}
