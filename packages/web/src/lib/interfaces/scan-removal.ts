import type {
  PlayingCardWithDistance,
  ScannedCard,
  ScanRemovalEntry,
} from "@magic-vault/shared";

export interface ScanRemovalContextValue {
  isRemoveModeEnabled: boolean;
  isRemoveModeActive: boolean;
  isSorterConnected: boolean;
  setRemoveModeEnabled: (enabled: boolean) => void;
  removalBinNumber: number | null;
  setRemovalBinNumber: (binNumber: number) => void;
  entries: ScanRemovalEntry[];
  queuedCount: number;
  pendingLookupCount: number;
  isRemoving: boolean;
  queueScannedCard: (
    matchedCard: PlayingCardWithDistance,
    alternativeMatches: PlayingCardWithDistance[],
  ) => void;
  handleRemovalNoMatch: () => void;
  selectEntryCopy: (entryId: string, scanId: string) => void;
  dropEntry: (entryId: string) => void;
  clearEntries: () => void;
  removeQueuedCards: () => Promise<void>;
}

export interface ScanRemovalRowProps {
  entry: ScanRemovalEntry;
  entries: ScanRemovalEntry[];
  onSelectCopy: (scanId: string) => void;
  onDrop: () => void;
}

export interface ScanRemovalCopyLabelProps {
  copy: ScannedCard;
}

export interface ScanRemovalListProps {
  className?: string;
}

export interface ScanRemovalActionsProps {
  className?: string;
}

export interface ScanModeSwitchProps {
  className?: string;
}

export interface ScanRemovalBinSelectProps {
  className?: string;
}

export interface MobileScanRemovalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
