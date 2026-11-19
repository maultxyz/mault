import type { TradeOffer } from "@magic-vault/shared";
import type { TFunction } from "i18next";

export function tradeOfferSourceLabel(offer: Pick<TradeOffer, "linkKind" | "sourceName">, t: TFunction): string {
  if (offer.linkKind === "inPerson") return t("tradeOffers.library.inPerson");
  return offer.sourceName ?? t("tradeOffers.unknownSource");
}
