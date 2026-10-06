import type {
  CardSearchDiagnostics,
  SearchNoMatchReason,
} from "./api.interface";
import type { PlayingCardWithDistance } from "./card.interface";
import type { OcrDiagnostics } from "./ocr-region.interface";

export interface Point {
  x: number;
  y: number;
}

export interface CardContour {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface ScanRegion {
  coverage: number; // 0-1
  offsetX: number; // -0.5 to 0.5
  offsetY: number; // -0.5 to 0.5
}

export interface DetectionResult {
  detected: boolean;
  contour: CardContour | null;
  confidence: number;
  sharpness?: number;
}

export type ScannerStatus =
  | "initializing"
  | "requesting-camera"
  | "scanning"
  | "paused"
  | "captured"
  | "duplicate"
  | "no-match"
  | "settling"
  | "searching"
  | "error";

export interface CardScannerProps {
  onSearchResults?: (
    matches: PlayingCardWithDistance[],
    capturedImageUrl?: string,
    vectorizedOn?: ScanVectorizeSource,
    details?: MatchedScanDetails,
  ) => void;
  onNoMatch?: (
    capturedImageUrl?: string,
    vectorizedOn?: ScanVectorizeSource,
    details?: UnmatchedScanDetails,
  ) => void;
  onManualAdd?: () => void;
  onError?: (error: string) => void;
  className?: string;
  compact?: boolean;
  controlsPosition?: "bottom" | "side";
}

export interface CardMatch {
  id: number;
  cardId: string;
  distance: number;
}

export type ScanVectorizeSource = "server" | "web";

export interface ScannedCard {
  scanId: string;
  card: PlayingCardWithDistance;
  scannedAt: number;
  binNumber?: number;
  capturedImageUrl?: string;
  alternativeMatches?: PlayingCardWithDistance[];
  isFoil?: boolean;
  foilType?: string;
  isDownloaded?: boolean;
  corrected?: boolean;
  needsReview?: boolean;
  vectorizedOn?: ScanVectorizeSource;
  diagnostics?: MatchedScanDiagnostics;
}

export type UnmatchedReason =
  | SearchNoMatchReason
  | "no_consensus"
  | "lookup_failed";

export interface ScanDetectionDiagnostics {
  cardDetected: boolean;
  sharpness: number | null;
  confidence: number | null;
  fallbackReason: string | null;
}

export interface ScanAttemptDiagnostic {
  reason: UnmatchedReason | null;
  cardId: string | null;
  cardName: string | null;
  distance: number | null;
}

export interface UnmatchedScanDiagnostics {
  reason: UnmatchedReason;
  search: Omit<CardSearchDiagnostics, "embedding"> | null;
  detection: ScanDetectionDiagnostics;
  orientation: "upright" | "rotated";
  matchesNeeded: number;
  attempts: ScanAttemptDiagnostic[];
  lookupFailedCardIds?: string[];
  ocr?: OcrDiagnostics | null;
}

export type ScanMatchSource = "embedding" | "ocr";

export interface MatchCandidateDiagnostic {
  cardId: string;
  name: string | null;
  distance: number;
  confidence: number;
}

export interface MatchedScanDiagnostics {
  matchedBy: ScanMatchSource;
  vectorizedOn: ScanVectorizeSource;
  detection: ScanDetectionDiagnostics;
  orientation: "upright" | "rotated";
  matchesNeeded: number;
  attempts: ScanAttemptDiagnostic[];
  candidates: MatchCandidateDiagnostic[];
  ocr: OcrDiagnostics | null;
  detectedColor?: string | null;
}

export interface MatchedScanDetails {
  needsReview: boolean;
  diagnostics: MatchedScanDiagnostics;
}

export interface UnmatchedScanDetails {
  diagnostics: UnmatchedScanDiagnostics;
  embedding: number[] | null;
}

export interface UnmatchedCard {
  scanId: string;
  capturedImageUrl?: string;
  scannedAt: number;
  binNumber?: number;
  vectorizedOn?: ScanVectorizeSource;
  diagnostics?: UnmatchedScanDiagnostics;
  embedding?: number[];
}

export interface ActiveScanningStats {
  scanners: number;
  sessions: number;
  orgs: number;
  connectedSorters: number;
  recentScans: number;
  windowMinutes: number;
}
