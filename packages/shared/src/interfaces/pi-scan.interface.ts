import type { ScanRemovalEntry } from "./scan-removal.interface";
import type { CardCondition } from "./card-condition.interface";

export type PiScanSessionPhase =
  | "idle"
  | "running"
  | "paused"
  | "stopped"
  | "error";

export type PiScanSessionActivity = "feeding" | "matching" | "routing";

export interface PiScanSessionSight {
  name: string | null;
  binNumber: number | null;
  matched: boolean;
}

export interface PiScanPendingSave {
  updatedAt: number;
  orgId: string;
  collectionGuid: string;
  scanId: string;
  status: "saving" | "saved" | "failed";
  card: {
    id: string;
    name: string;
    set: string;
    collectorNumber: string;
  };
}

export interface PiScanSessionState {
  pendingSave?: PiScanPendingSave | null;
  allowDuplicates?: boolean;
  removalEnabled?: boolean;
  removalBinNumber?: number | null;
  condition?: CardCondition;
  foilType?: string | null;
  preferredSetCodes?: string[];
  removalBusy?: boolean;
  removalEntries?: ScanRemovalEntry[];
  soundEvents?: { id: string; clipGuid: string; at: number }[];
  phase: PiScanSessionPhase;
  collectionGuid: string | null;
  message: string | null;
  cardsScanned: number;
  stopping: boolean;
  activity: PiScanSessionActivity | null;
  current: PiScanSessionSight | null;
  lastCard: PiScanSessionSight | null;
  startedAt: string | null;
  pausedMs: number;
  pausedAt: string | null;
  autoFeed: boolean;
}

export interface PiScanSessionStartBody {
  allowDuplicates?: boolean;
  removalEnabled?: boolean;
  removalBinNumber?: number | null;
  condition?: CardCondition;
  collectionGuid: string;
  foilType?: string | null;
  preferredSetCodes?: string[];
  autoFeed?: boolean;
}

export interface PiScanSessionSettingsBody {
  allowDuplicates?: boolean;
  removalEnabled?: boolean;
  removalBinNumber?: number | null;
  condition?: CardCondition;
  foilType?: string | null;
  preferredSetCodes?: string[];
  autoFeed?: boolean;
}

export type PiScanSessionStartCode =
  | "running"
  | "busy"
  | "missing"
  | "unsupported"
  | "invalid";

export interface PiScanSessionResult {
  success: boolean;
  data?: PiScanSessionState;
  message?: string;
  code?: PiScanSessionStartCode;
}

export type PiScanRemovalAction =
  | { action: "select"; entryId: string; scanId: string }
  | { action: "drop"; entryId: string }
  | { action: "clear" }
  | { action: "remove" };
