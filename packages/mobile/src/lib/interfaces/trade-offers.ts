import type { PriceSource, TradeOfferOfferedCard, TradeOfferWantedCard } from "@magic-vault/shared";

export interface TradeOfferCardsProps {
  cards: (TradeOfferWantedCard | TradeOfferOfferedCard)[];
  prices: (number | null)[];
  priceSource: PriceSource;
}
