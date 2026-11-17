import type { ScannedCard } from "./interfaces/scanner.interface";
import type {
  CollectionReviewAcceptRequest,
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

export function groupReviewAcceptRequests(
  cards: ReviewGridCard[],
): CollectionReviewAcceptRequest[] {
  const requests = new Map<string, CollectionReviewAcceptRequest>();
  for (const card of cards) {
    let request = requests.get(card.collectionGuid);
    if (!request) {
      request = {
        collectionGuid: card.collectionGuid,
        confirmScanIds: [],
        reviewScanIds: [],
      };
      requests.set(card.collectionGuid, request);
    }
    if (reviewAcceptKind(card) === "confirm") request.confirmScanIds.push(card.scanId);
    else request.reviewScanIds.push(card.scanId);
  }
  return [...requests.values()];
}
