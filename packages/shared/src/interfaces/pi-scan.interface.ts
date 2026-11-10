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

export interface PiScanSessionState {
  condition?: CardCondition;
  foilType?: string | null;
  preferredSetCodes?: string[];
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
  condition?: CardCondition;
  collectionGuid: string;
  foilType?: string | null;
  preferredSetCodes?: string[];
  autoFeed?: boolean;
}

export interface PiScanSessionSettingsBody {
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
