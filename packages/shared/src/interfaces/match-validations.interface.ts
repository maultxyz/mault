import type { OcrReadRegion } from "./ocr-region.interface";
import type { ScanMatchSource } from "./scanner.interface";

export interface MatchValidationQueueItem {
  scanId: string;
  gameKey: string | null;
  cardName: string | null;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  matchedBy: ScanMatchSource | null;
  lowConfidenceMatch: boolean;
  scannedAt: string;
  capturedImageUrl: string | null;
  catalogImageUrl: string | null;
  ocrRegions: OcrReadRegion[] | null;
  reviewCount: number;
}

export interface MatchValidationCounts {
  validatedByYou: number;
  validatedByCommunity: number;
}

export interface MatchValidationQueue {
  items: MatchValidationQueueItem[];
  counts: MatchValidationCounts;
}

export interface MatchValidationProgress {
  scanCount: number;
  reviewCount: number;
}

export type MatchValidationVerdict = "correct" | "incorrect" | "badScan";

export type MatchValidationStatus =
  | "inProgress"
  | "correct"
  | "incorrect"
  | "badScan"
  | "disputed";

export interface MatchValidationVerdictCounts {
  correctCount: number;
  incorrectCount: number;
  badScanCount: number;
}

export interface MatchValidationScan extends MatchValidationVerdictCounts {
  scanId: string;
  cardName: string | null;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  scannedAt: string;
  capturedImageUrl: string | null;
  catalogImageUrl: string | null;
  yourVerdict: MatchValidationVerdict | null;
  status: MatchValidationStatus;
}

export interface MatchValidationRequest {
  scanId: string;
  verdict: MatchValidationVerdict;
}
