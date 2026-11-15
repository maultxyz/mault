import { summarizeTradeOfferPlacements, type TradeOfferWantedPlacement } from "@magic-vault/shared";
import type {
  TradeOfferPlacementLine,
  TradeOfferReviewTFunction,
} from "@/lib/interfaces/trade-offers";

export function tradeOfferPlacementLines(
  placements: (TradeOfferWantedPlacement | null)[],
  t: TradeOfferReviewTFunction,
): TradeOfferPlacementLine[] {
  return summarizeTradeOfferPlacements(placements).map((summary) => {
    if (summary.kind === "storage") {
      return {
        isMissing: false,
        text:
          summary.positions.length > 0
            ? t("tradeOffers.cardList.placementStorage", {
                location: summary.locationName,
                positions: summary.positions.join(", "),
              })
            : t("tradeOffers.cardList.placementStorageNoPosition", { location: summary.locationName }),
      };
    }
    if (summary.kind === "bin") {
      return {
        isMissing: false,
        text: t("tradeOffers.cardList.placementBin", {
          count: summary.binNumbers.length,
          collection: summary.collectionName,
          bins: summary.binNumbers.join(", "),
        }),
      };
    }
    if (summary.kind === "collection") {
      return {
        isMissing: false,
        text: t("tradeOffers.cardList.placementCollection", { collection: summary.collectionName }),
      };
    }
    return {
      isMissing: true,
      text: t("tradeOffers.cardList.placementMissing", { count: summary.count }),
    };
  });
}
