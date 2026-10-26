import type { ScannedCard } from "./interfaces/scanner.interface";
import type {
  ReviewAcceptKind,
  ReviewGridCard,
} from "./interfaces/review-grid.interface";

export function reviewAcceptKind(card: ReviewGridCard): ReviewAcceptKind {
  return (card.lowConfidenceMatch || card.hasAlternatives) && !card.corrected
    ? "confirm"
    : "review";
}

export function toReviewGridCard(
  collectionGuid: string,
  entry: ScannedCard,
): ReviewGridCard {
  return {
    scanId: entry.scanId,
    collectionGuid,
    card: entry.card,
    lowConfidenceMatch: !!entry.lowConfidenceMatch,
    hasAlternatives: !!entry.alternativeMatches?.length,
    corrected: !!entry.corrected,
  };
}
