export interface BinRow {
  guid: string | null;
  binNumber: number;
  rules: unknown;
  isCatchAll: boolean;
  isOverride: boolean;
  overridePriority: number | null;
  lowMatchPercent: number | null;
  maxCopies: number | null;
  maxCopiesBy: string | null;
  maxCards: number | null;
  overflowBin: number | null;
  isDisabled: boolean;
  pickList: unknown;
  repackPriority: number | null;
  claimedStorageLocationId: number | null;
}
