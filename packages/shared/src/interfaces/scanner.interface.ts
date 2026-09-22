import type { PlayingCardWithDistance } from "./card.interface";

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

export const DEFAULT_SCAN_REGION: ScanRegion = {
  coverage: 0.85,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_CAPTURE_SETTLE_DELAY_MS = 500;

// How many consecutive live frames must agree on the same top match before a
// capture is accepted - 1 disables consensus (first frame wins, fastest), a
// higher value trades capture speed for reliability against a single noisy
// frame (motion blur, a momentary bad corner detection, etc).
export const DEFAULT_MATCHES_NEEDED = 2;

export interface DetectionResult {
  detected: boolean;
  contour: CardContour | null;
  confidence: number;
  // SimCC mean-peak sharpness from the Cornelius corner detector (0-1).
  // Only set for a live neural detection, not the static default contour.
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
  | "searching"
  | "error";

export interface CardScannerProps {
  onSearchResults?: (
    matches: PlayingCardWithDistance[],
    capturedImageUrl?: string,
  ) => void;
  onNoMatch?: (capturedImageUrl?: string) => void;
  onManualAdd?: () => void;
  onError?: (error: string) => void;
  className?: string;
  compact?: boolean;
}

export interface CardMatch {
  id: number;
  cardId: string;
  distance: number;
}

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
}

export interface UnmatchedCard {
  scanId: string;
  capturedImageUrl?: string;
  scannedAt: number;
}
