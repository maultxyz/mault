import type {
  PickList,
  ModuleConfig,
  FeederCalibration,
  ServoCalibration,
  FoilNudgeFirmwareLimits,
  ScanRemovalEntry,
  SoundRule,
  CardCondition,
  ResolvedCardSearchMatches,
  BinConfig,
  BinRoute,
  BinSet,
  FieldMeta,
  OcrDiagnostics,
  PiScanSessionActivity,
  PiScanPendingSave,
  PiScanSessionPhase,
  PiScanSessionSight,
  PiScanSessionStartBody,
  PiScanSessionStartCode,
  PiScanSessionState,
  ScanDetectionDiagnostics,
  ScanMatchSource,
  ScanRegion,
  StampDetection,
  PrintedFoilMarkerDetection,
} from "@magic-vault/shared";
import type { CardMatchSearchResult } from "./card-search";
import type { SorterLink } from "../pi-scan/sorter-link";

export interface PiScanBinCard {
  binNumber?: number | null;
  scannedAt: number;
  unsaved?: boolean;
  capacityOnly?: boolean;
  card: object;
}

export interface PiScanSorterConfiguration {
  channelOffset: number;
  moduleCalibrations: ModuleConfig[];
  feederCalibration: FeederCalibration | null;
}

export interface PiScanRunContext extends PiScanSorterConfiguration {
  nudgeCalibration: ServoCalibration | null;
  soundRules: SoundRule[];
  hardwareId: string;
  collectionId: number;
  collectionName: string;
  gameId: number;
  gameKey: string;
  gameName: string | undefined;
  lang: string;
  deviceGuid: string;
  moduleCount: number;
  region: ScanRegion;
  settleMs: number;
  feedRetryCount: number;
  pipelinedFeed: boolean;
  checkBothOrientations: boolean;
  flipCamera: boolean;
  matchesNeeded: number;
  matchAllLanguages: boolean;
  ocrEnabled: boolean;
  foilDetectionEnabled: boolean;
  isFoilStarDetectionEnabled: boolean;
  highAccuracyScans: boolean;
  cardThickness: number | null;
  fieldDefinitions: FieldMeta[];
  foilTypes: string[];
  gameGuid: string;
  set: BinSet;
  configs: BinConfig[];
  pickConfigs: BinConfig[];
  routes: BinRoute[];
  heights: Map<number, number>;
  counts: Map<number, number>;
  contents: PiScanBinCard[];
}

export interface PiScanLive {
  pendingSave: PiScanPendingSave | null;
  configurationVersion: number;
  allowDuplicates: boolean;
  lastCardId: string | null;
  removalEnabled: boolean;
  removalBinNumber: number | null;
  removalEntries: ScanRemovalEntry[];
  removalBusy: boolean;
  soundEvents: { id: string; clipGuid: string; at: number }[];
  nudgeLimits: FoilNudgeFirmwareLimits | null;
  nudgeCalibration: ServoCalibration | null;
  phase: PiScanSessionPhase;
  orgId: string;
  userId: string;
  jwtClaims: string;
  collectionGuid: string;
  message: string | null;
  cardsScanned: number;
  activity: PiScanSessionActivity | null;
  current: PiScanSessionSight | null;
  lastCard: PiScanSessionSight | null;
  condition: CardCondition;
  foilType: string | null;
  preferredSetCodes: string[];
  autoFeed: boolean;
  feedRequested: boolean;
  cardInFlight: boolean;
  startedAt: number;
  pausedMs: number;
  pauseStartedAt: number | null;
  pauseRequested: boolean;
  refreshRequested: boolean;
  stopRequested: boolean;
  handedOff: boolean;
  locked: boolean;
  portHeld: boolean;
  context: PiScanRunContext | null;
  link: SorterLink | null;
  done: Promise<void>;
  resolveDone: () => void;
}

export interface PiScanFrameMatch {
  image: Buffer;
  orientation: "upright" | "rotated";
  result: CardMatchSearchResult;
  resolved: ResolvedCardSearchMatches;
  embedding: number[] | null;
  ocr: OcrDiagnostics | null;
  matchedBy: ScanMatchSource;
  lowConfidenceFromOcr: boolean;
  detection: ScanDetectionDiagnostics;
  stampDetection: StampDetection | null;
  printedFoilMarker: PrintedFoilMarkerDetection | null;
  foilDetection: import("@magic-vault/shared").FoilDetection | null;
}

export interface PiScanPipelineOptions {
  enabled: () => boolean;
  onFed: (reply: Record<string, unknown>) => void;
}

export interface PiScanStartInput {
  orgId: string;
  userId: string;
  jwtClaims: string;
  body: PiScanSessionStartBody;
}

export type PiScanStartResult =
  | { ok: true; state: PiScanSessionState }
  | {
      ok: false;
      status: 400 | 409;
      code: PiScanSessionStartCode;
      message: string;
    };

export interface PiScanRouteJson {
  success?: boolean;
  message?: string;
  data?: { pickList?: PickList | null };
}

export type PiScanRecoveryState = Pick<
  PiScanLive,
  | "phase"
  | "pauseRequested"
  | "stopRequested"
  | "refreshRequested"
  | "context"
  | "message"
>;

export interface PendingPiScanSave {
  orgId: string;
  userId: string;
  collectionGuid: string;
  kind: "cards" | "unmatched";
  body: { scanId: string; [key: string]: unknown };
  queuedAt: number;
}

export interface PiScanSaveOptions {
  userId: string;
  stopping: () => boolean;
}

export interface PiScanSaveResult {
  success: boolean;
  message: string;
  status?: number;
}

export type SendPendingPiScanSave = (
  save: PendingPiScanSave,
  isRetry: boolean,
) => Promise<PiScanSaveResult>;

export interface PiScanIdentification {
  matched: PiScanFrameMatch;
  attempts: import("@magic-vault/shared").ScanAttemptDiagnostic[];
  card: import("@magic-vault/shared").PlayingCardWithDistance | null;
}

export interface PiScanWorkflowPorts {
  capture(): Promise<Buffer>;
  readControl(frame: Buffer): Promise<string | null>;
  applyControl(
    command: import("@magic-vault/shared").ScannerControlCommand | null,
  ): Promise<void>;
  identify(frame: Buffer): Promise<PiScanIdentification>;
  removal(outcome: PiScanIdentification): Promise<void>;
  nudge(
    outcome: PiScanIdentification,
  ): Promise<import("@magic-vault/shared").FoilDetection | null>;
  matched(outcome: PiScanIdentification): Promise<void>;
  unmatched(outcome: PiScanIdentification): Promise<void>;
  holdDuplicate(): void;
  checkpoint(): Promise<boolean>;
}

export type PiScanRemovalQueue = Pick<
  PiScanLive,
  "removalBusy" | "removalEntries"
>;
