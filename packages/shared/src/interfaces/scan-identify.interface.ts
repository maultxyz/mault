import type { StampDetection } from "./card-stamps.interface";
import type { PrintedFoilMarkerDetection } from "./printed-foil-marker.interface";
import type { PrintingMarkMatch } from "./printing-regions.interface";
import type {
  CardSearchDiagnostics,
  CardSearchResult,
  CardTextSearchResult,
  SearchCardMatch,
} from "./api.interface";
import type { PlayingCard, PlayingCardWithDistance } from "./card.interface";
import type { OcrDiagnostics } from "./ocr-region.interface";
import type {
  MatchCandidateDiagnostic,
  MatchedScanDetails,
  ScanDetectionDiagnostics,
  ScanMatchSource,
  UnmatchedReason,
  UnmatchedScanDetails,
} from "./scanner.interface";

export type ScanOrientation = "upright" | "rotated";

export interface ResolvedCardSearchMatches {
  card: PlayingCardWithDistance | null;
  alternativeMatches: PlayingCardWithDistance[];
  noMatchReason: UnmatchedReason | null;
  lookupFailedCardIds?: string[];
  candidates: MatchCandidateDiagnostic[];
}

export interface ScanAttemptResult extends ResolvedCardSearchMatches {
  detection: ScanDetectionDiagnostics;
  search: CardSearchDiagnostics | null;
  orientation: ScanOrientation;
  embedding: number[] | null;
  topDistance: number | null;
  ocr: OcrDiagnostics | null;
  lowConfidenceMatch: boolean;
  matchedBy: ScanMatchSource;
  stampDetection?: StampDetection | null;
  printedFoilMarker?: PrintedFoilMarkerDetection | null;
  printingMarks?: PrintingMarkMatch | null;
}

export interface ScanMatchDetails {
  matched: MatchedScanDetails | null;
  noMatch: UnmatchedScanDetails | null;
}

export interface OrientedSearchCandidate {
  result: CardSearchResult;
}

export type LookupMatchedCard = (
  match: SearchCardMatch,
) => Promise<PlayingCard | null | undefined>;

export interface ScanImageCandidate extends OrientedSearchCandidate {
  orientation: ScanOrientation;
  embedding: number[] | null;
  textResult?: CardTextSearchResult | null;
}

export interface ScanImageSearchOptions<T extends ScanImageCandidate> {
  checkBothOrientations: boolean;
  ocrEnabled?: boolean;
  ocrMode?: ScanOcrMode | ((candidate: T) => ScanOcrMode);
  search: (orientation: ScanOrientation) => Promise<T>;
  readText?: (
    candidate: T,
  ) => Promise<(T & { ocr: OcrDiagnostics | null }) | null>;
}

export interface ScanImageSearchOutcome<T extends ScanImageCandidate> {
  pick: T;
  alternate: T | null;
  ocr: OcrDiagnostics | null;
  matchedBy: ScanMatchSource;
  lowConfidenceMatch: boolean;
}

export interface ScanConsensusOutcome<T> {
  attempt: T;
  attempts: T[];
  card: PlayingCardWithDistance | null;
}
export type ScanOcrMode = "off" | "when-unsure" | "every-scan";
