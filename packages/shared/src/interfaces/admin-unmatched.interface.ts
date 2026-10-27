import type {
  SearchCandidateDiagnostic,
  SearchNoMatchReason,
} from "./api.interface";
import type { PlayingCard } from "./card.interface";
import type { OcrDiagnostics, OcrRegionTrace } from "./ocr-region.interface";
import type {
  ScanMatchSource,
  UnmatchedReason,
} from "./scanner.interface";

export interface AdminUnmatchedScan {
  scanId: string;
  orgId: string;
  orgName: string | null;
  collectionName: string;
  gameKey: string | null;
  lang: string;
  scannedAt: string;
  capturedImageUrl: string | null;
  hasEmbedding: boolean;
  originalReason: UnmatchedReason | null;
  originalNearestName: string | null;
  originalNearestDistance: number | null;
}

export type AdminUnmatchedRetryStatus =
  | "match"
  | "no_match"
  | "no_embedding"
  | "no_game";

export interface AdminUnmatchedRetryResult {
  scanId: string;
  status: AdminUnmatchedRetryStatus;
  matchedBy: ScanMatchSource | null;
  ocr: OcrDiagnostics | null;
  card: PlayingCard | null;
  distance: number | null;
  reason: SearchNoMatchReason | null;
  runnerUpName: string | null;
  runnerUpDistance: number | null;
  candidates: SearchCandidateDiagnostic[];
}

export interface AdminUnmatchedOcrResult {
  scanId: string;
  supported: boolean;
  regions: OcrRegionTrace[];
  ocr: OcrDiagnostics | null;
  card: PlayingCard | null;
  distance: number | null;
}

export interface AdminUnmatchedRetryRequest {
  scanIds: string[];
  withOcr?: boolean;
}
