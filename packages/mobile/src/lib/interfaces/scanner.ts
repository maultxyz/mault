import type { CameraDevice, CameraOutput } from "react-native-vision-camera";
import type {
  CardContour,
  CardSearchResult,
  MatchedScanDetails,
  PlayingCardWithDistance,
  RgbaImage,
  ScanAttemptResult,
  ScanRegion,
  ScannedCard,
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

export interface ScanAttempt extends ScanAttemptResult {
  contour: CardContour | null;
  pixels: RgbaImage | null;
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
  | "no-match"
  | "duplicate"
  | "repack-complete"
  | "bin-data-unavailable";

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

export interface ScanSessionInputs {
  capture: () => Promise<CapturedFrame>;
}

export interface ScanSessionValue extends ScanSessionState {
  isRunning: boolean;
  canStart: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  scanOnce: () => void;
  feedOnce: () => Promise<void>;
  autoFeed: boolean;
  setAutoFeed: (value: boolean) => void;
  allowDuplicates: boolean;
  setAllowDuplicates: (value: boolean) => void;
  handScan: boolean;
  setHandScan: (value: boolean) => void;
  handScanActive: boolean;
  trackLiveCorners: (corners: LiveCorners | null) => void;
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

export interface SmoothedCorners extends LiveCorners {
  opacity: number;
}

export interface HandScanTracker {
  update: (corners: LiveCorners | null, canCapture: boolean) => boolean;
}

export interface SessionScansSheetProps {
  visible: boolean;
  entries: ScanFeedEntry[];
  collectionGuid: string | null;
  onClose: () => void;
}

export interface ScannerControlsSheetProps {
  visible: boolean;
  running: boolean;
  canScan: boolean;
  onScanNow: () => void;
  onFeedOne: () => Promise<void>;
  autoFeed: boolean;
  onClose: () => void;
}

export interface ScanOptionsSheetProps {
  visible: boolean;
  running: boolean;
  autoFeed: boolean;
  onAutoFeedChange: (value: boolean) => void;
  allowDuplicates: boolean;
  onAllowDuplicatesChange: (value: boolean) => void;
  handScan: boolean;
  onHandScanChange: (value: boolean) => void;
  collectionName: string | null;
  presetName: string | null;
  showPreset: boolean;
  cameraName: string | null;
  showCamera: boolean;
  onChooseCollection: () => void;
  onChoosePreset: () => void;
  onChooseCamera: () => void;
  onClose: () => void;
}

export type ScannerControlAction = "scan" | "feed" | "drop" | "neutral";

export interface CameraChoice {
  devices: CameraDevice[];
  device: CameraDevice | undefined;
  select: (id: string) => void;
}

export interface PhoneCameraResponderOptions {
  collectionGuid: string;
  enabled: boolean;
  capture: () => Promise<string | null>;
}

export interface PhoneCameraResponder {
  connected: boolean;
  sessionEnded: boolean;
  capturedCount: number;
  scanRegion: ScanRegion | null;
}

export interface QrScanner {
  outputs: CameraOutput[];
}
