import type {
  MatchedScanDiagnostics,
  PlayingCardWithDistance,
  ScanVectorizeSource,
  ScannedCard,
  UnmatchedCard,
  UnmatchedScanDiagnostics,
} from "@magic-vault/shared";

export interface SaveMatchedScanInput {
  jwtClaims: string;
  userId: string;
  orgId: string;
  collectionGuid: string;
  scanId: string;
  card: PlayingCardWithDistance;
  scannedAt: number;
  binNumber?: number;
  capturedImageUrl?: string;
  isFoil?: boolean;
  foilType?: string;
  alternativeMatches?: PlayingCardWithDistance[];
  needsReview?: boolean;
  diagnostics?: MatchedScanDiagnostics;
  vectorizedOn?: ScanVectorizeSource;
  deviceGuid?: string;
}

export interface SaveUnmatchedScanInput {
  jwtClaims: string;
  orgId: string;
  collectionGuid: string;
  scanId: string;
  scannedAt: number;
  capturedImageUrl?: string;
  binNumber?: number;
  vectorizedOn?: ScanVectorizeSource;
  diagnostics?: UnmatchedScanDiagnostics;
  embedding?: number[] | null;
  deviceGuid?: string;
}

export type SaveScanResult =
  | { success: true; data: ScannedCard | UnmatchedCard }
  | {
      success: false;
      message: string;
      scanLimitReached?: boolean;
      sorterLimitReached?: boolean;
      binLimitReached?: boolean;
      binNumber?: number;
    };
