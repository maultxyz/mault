import type {
  CardReviewStatus,
  CardReviewStatusInput,
} from "./interfaces/collection-cards.interface";

export function cardReviewStatus({
  hasAlternatives = false,
  lowConfidenceMatch = false,
  wasCorrected = false,
  isReviewed = false,
}: CardReviewStatusInput): CardReviewStatus | null {
  if (hasAlternatives || lowConfidenceMatch) {
    return wasCorrected || isReviewed ? "reviewed" : "needsAttention";
  }
  return isReviewed ? "reviewed" : null;
}
