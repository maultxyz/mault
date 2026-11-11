import type {
  PickListEntry,
  PickListEntryInput,
  StorageLocation,
  StorageLocationSearchResult,
  StorageVerifyNameCount,
} from "@magic-vault/shared";

export interface StoragePickListState {
  decklist: string;
  entries: PickListEntryInput[];
  lines: PickListEntry[];
  cards: StorageLocationSearchResult[];
  pickedScanIds: ReadonlySet<string>;
  pickedCount: number;
  isLoading: boolean;
  isError: boolean;
  isFinishing: boolean;
  finishFailed: boolean;
  setDecklist: (decklist: string) => void;
  setPicked: (scanId: string, picked: boolean) => void;
  clear: () => void;
  finish: () => void;
  refetch: () => void;
}

export interface StorageVerifyState {
  cards: StorageLocationSearchResult[];
  verifiedScanIds: ReadonlySet<string>;
  verifiedCount: number;
  notInLocation: StorageVerifyNameCount[];
  isLoading: boolean;
  isError: boolean;
  isTruncated: boolean;
  setVerified: (scanId: string, verified: boolean) => void;
  addNotInLocation: (cardName: string) => void;
  startOver: () => void;
  refetch: () => void;
}

export type CardScanNoticeKind = "checked" | "already-checked" | "not-listed" | "no-match" | "failed";

export interface CardScanNotice {
  noticeId: number;
  kind: CardScanNoticeKind;
  cardName?: string;
  locationName?: string;
  position?: number;
}

export interface StoragePickListFormProps {
  initialDecklist: string;
  onSubmit: (decklist: string) => void;
  onCancel?: () => void;
}

export type StorageLocationTab = "cards" | "verify";

export interface StorageLocationVerifyProps {
  location: StorageLocation;
}

export interface StorageLocationActionTarget {
  guid: string;
  name: string;
}

export interface StorageLocationActionsOptions {
  onDeleted?: () => void;
}
