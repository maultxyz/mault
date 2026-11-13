import type { ScannedCard } from "./interfaces/scanner.interface";
import type {
  CollectionReviewAcceptRequest,
  ReviewAcceptKind,
  ReviewGridAttributes,
  ReviewGridAttributeUpdate,
  ReviewGridCard,
} from "./interfaces/review-grid.interface";
import { scanLanguage } from "./card-language";
import { toCardCondition } from "./card-condition";

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
    isFoil: !!entry.isFoil,
    foilType: entry.foilType ?? null,
    stamp: entry.stamp ?? null,
    condition: toCardCondition(entry.condition),
    language: entry.language ?? null,
  };
}

export function reviewGridAttributesOf(
  card: ReviewGridCard,
  defaultFoilType: string,
): ReviewGridAttributes {
  return {
    foilType: card.foilType ?? (card.isFoil ? defaultFoilType : null),
    stamp: card.stamp,
    condition: card.condition,
    language: scanLanguage(card),
  };
}

export function reviewGridAttributeUpdate(
  saved: ReviewGridAttributes,
  draft: ReviewGridAttributes | undefined,
): ReviewGridAttributeUpdate | null {
  if (!draft) return null;
  const foilChanged = draft.foilType !== saved.foilType;
  const stampChanged = draft.stamp !== saved.stamp;
  const conditionChanged = draft.condition !== saved.condition;
  const languageChanged = draft.language !== saved.language;
  if (!foilChanged && !stampChanged && !conditionChanged && !languageChanged) {
    return null;
  }
  return {
    isFoil: draft.foilType != null,
    foilType: draft.foilType,
    condition: draft.condition,
    ...(stampChanged ? { stamp: draft.stamp } : {}),
    ...(languageChanged ? { language: draft.language } : {}),
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
