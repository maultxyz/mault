import type { TFunction } from "i18next";

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
