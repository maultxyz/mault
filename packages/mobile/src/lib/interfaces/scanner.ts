import type {
  BinConfig,
  BinSet,
  CardContour,
  FieldMeta,
  CardSearchResult,
  MatchCandidateDiagnostic,
  MatchedScanDetails,
  OcrDiagnostics,
  PlayingCardWithDistance,
  RgbaImage,
  ScanDetectionDiagnostics,
  ScanMatchSource,
  ScannedCard,
  SearchNoMatchReason,
  UnmatchedCard,
  UnmatchedScanDetails,
} from "@magic-vault/shared";
import type { Image } from "react-native-nitro-image";

export interface CapturedFrame {
  image: Image;
  pixels: RgbaImage;
  scale: number;
}

export type Orientation = "upright" | "rotated";

export interface MatchScope {
  collectionGuid: string;
  preferredSetCode?: string | null;
}

export interface OrientedPick {
  pixels: RgbaImage;
  orientation: Orientation;
  embedding: number[];
  result: CardSearchResult;
  alternate: OrientedPick | null;
}

export interface ScanAttempt {
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  noMatchReason: SearchNoMatchReason | "lookup_failed" | null;
  lookupFailedCardIds?: string[];
  candidates: MatchCandidateDiagnostic[];
  detection: ScanDetectionDiagnostics;
  contour: CardContour | null;
  orientation: Orientation;
  embedding: number[] | null;
  pixels: RgbaImage | null;
  search: CardSearchResult["diagnostics"] | null;
  topDistance: number | null;
  ocr: OcrDiagnostics | null;
  matchedBy: ScanMatchSource;
  lowConfidenceMatch: boolean;
  detectedColor: string | null;
}

export interface IdentifyOptions {
  scope: MatchScope;
  matchesNeeded: number;
  checkBothOrientations: boolean;
  ocrEnabled: boolean;
  colorBarRegionKey: string | null;
  minSharpness?: number;
}

export interface IdentifyOutcome {
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  capturedImageUrl: string | null;
  matched: MatchedScanDetails | null;
  noMatch: UnmatchedScanDetails | null;
}

export type ScannerPhase =
  | "idle"
  | "loading-models"
  | "ready"
  | "feeding"
  | "capturing"
  | "identifying"
  | "routing"
  | "paused"
  | "error";

export type ScannerPauseReason =
  | "user"
  | "feeder-empty"
  | "no-card"
  | "feed-failed"
  | "route-failed"
  | "jam"
  | "bin-full"
  | "scan-limit"
  | "sorter-limit"
  | "collection-locked"
  | "save-failed"
  | "sorter-disconnected"
  | "no-match";

export interface ScanFeedEntry {
  scanId: string;
  scannedAt: number;
  card: PlayingCardWithDistance | null;
  binNumber?: number;
  capturedImageUrl?: string;
  lowConfidence?: boolean;
}

export interface ScanSessionState {
  phase: ScannerPhase;
  pauseReason: ScannerPauseReason | null;
  pauseDetail: string | null;
  feed: ScanFeedEntry[];
  sessionCount: number;
  modelError: string | null;
}

export interface PendingCardSave {
  kind: "card";
  key: string;
  orgId: string | null;
  collectionGuid: string;
  deviceGuid?: string;
  record: ScannedCard;
  attempts: number;
}

export interface PendingUnmatchedSave {
  kind: "unmatched";
  key: string;
  orgId: string | null;
  collectionGuid: string;
  deviceGuid?: string;
  record: UnmatchedCard;
  attempts: number;
}

export type PendingScanSave = PendingCardSave | PendingUnmatchedSave;

export interface CardSaveResult {
  success: boolean;
  message?: string;
  binLimitReached?: boolean;
  sorterLimitReached?: boolean;
  scanLimitReached?: boolean;
}

export interface PendingSavesContextValue {
  pendingCount: number;
  saveCard: (save: Omit<PendingCardSave, "kind" | "key" | "attempts">) => Promise<CardSaveResult>;
  saveUnmatched: (save: Omit<PendingUnmatchedSave, "kind" | "key" | "attempts">) => Promise<CardSaveResult>;
}

export interface RoutingContext {
  set: BinSet | undefined;
  configs: BinConfig[];
  fieldDefinitions: FieldMeta[];
  countInBin: (binNumber: number) => number;
  isBinFull: (binNumber: number) => boolean;
}

export interface RoutingDecision {
  bin: BinConfig | undefined;
  isLowMatch: boolean;
  pickListName: string | null;
  allChaosBinsFull: boolean;
}

export type UnsupportedScanMode = "repack" | "auto-assign";

export interface ScanSessionInputs {
  capture: () => Promise<CapturedFrame>;
}

export interface ScanSessionValue extends ScanSessionState {
  isRunning: boolean;
  unsupportedMode: UnsupportedScanMode | null;
  canStart: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  scanOnce: () => void;
}

export type StreamStatus = "connecting" | "connected" | "error";

export interface MonitorState {
  status: StreamStatus;
  collectionName: string | null;
  recentCards: ScannedCard[];
  unmatchedCount: number;
  viewerCount: number;
  errors: string[];
}

export interface LiveCorners {
  contour: CardContour;
  frameWidth: number;
  frameHeight: number;
}
