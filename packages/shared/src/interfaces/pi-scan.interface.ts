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
  collectionGuid: string;
  foilType?: string | null;
  preferredSetCode?: string | null;
  autoFeed?: boolean;
}

export type PiScanBottomPosition = "open" | "closed";

export interface PiScanBottomsBody {
  position: PiScanBottomPosition;
}

export interface PiScanSessionSettingsBody {
  foilType?: string | null;
  preferredSetCode?: string | null;
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
