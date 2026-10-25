import type {
  CardSearchDiagnostics,
  CardSearchResult,
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
  detectedColor: string | null;
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
