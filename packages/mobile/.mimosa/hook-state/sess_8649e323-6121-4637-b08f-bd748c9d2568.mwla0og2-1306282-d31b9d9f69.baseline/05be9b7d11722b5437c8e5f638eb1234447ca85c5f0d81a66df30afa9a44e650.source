import { summarizeTradeOfferPlacements, type TradeOfferWantedPlacement } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function tradeOfferPlacementLines(
  placements: (TradeOfferWantedPlacement | null)[],
  t: TFunction,
): string[] {
  return summarizeTradeOfferPlacements(placements).map((summary) => {
    if (summary.kind === "storage") {
      return summary.positions.length > 0
        ? t("tradeOffers.cardList.placementStorage", {
            location: summary.locationName,
            positions: summary.positions.join(", "),
          })
        : t("tradeOffers.cardList.placementStorageNoPosition", { location: summary.locationName });
    }
    if (summary.kind === "bin") {
      return t("tradeOffers.cardList.placementBin", {
        count: summary.binNumbers.length,
        collection: summary.collectionName,
        bins: summary.binNumbers.join(", "),
      });
    }
    if (summary.kind === "collection") {
      return t("tradeOffers.cardList.placementCollection", { collection: summary.collectionName });
    }
    return t("tradeOffers.cardList.placementMissing", { count: summary.count });
  });
}
