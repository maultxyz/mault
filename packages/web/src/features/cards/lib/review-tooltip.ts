import type { TFunction } from "i18next";

export function reviewTooltip(
  t: TFunction,
  needsReview: boolean,
  wasCorrected: boolean,
): string {
  if (needsReview) {
    return wasCorrected
      ? t("scannedCardItem.needsReviewResolvedTooltip")
      : t("scannedCardItem.needsReviewTooltip");
  }
  return wasCorrected
    ? t("scannedCardItem.multipleMatchesResolvedTooltip")
    : t("scannedCardItem.multipleMatchesTooltip");
}
