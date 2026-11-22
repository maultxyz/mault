import type {
  CardReviewStatus,
  CardReviewStatusInput,
} from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function reviewStatusLabel(
  t: TFunction,
  status: CardReviewStatus | null,
  { lowConfidenceMatch = false, hasAlternatives = false }: CardReviewStatusInput,
): string | null {
  if (!status) return null;
  if (!lowConfidenceMatch && !hasAlternatives) {
    return t("scannedCardItem.reviewedTooltip");
  }
  return reviewTooltip(t, lowConfidenceMatch, status === "reviewed");
}

export function reviewTooltip(
  t: TFunction,
  lowConfidenceMatch: boolean,
  wasCorrected: boolean,
): string {
  if (lowConfidenceMatch) {
    return wasCorrected
      ? t("scannedCardItem.lowConfidenceResolvedTooltip")
      : t("scannedCardItem.lowConfidenceTooltip");
  }
  return wasCorrected
    ? t("scannedCardItem.multipleMatchesResolvedTooltip")
    : t("scannedCardItem.multipleMatchesTooltip");
}
