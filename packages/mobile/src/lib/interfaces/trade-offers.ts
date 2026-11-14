import type { PriceSource, TradeOffer, TradeOfferOfferedCard, TradeOfferStatus, TradeOfferWantedCard } from "@magic-vault/shared";
import type { StatusTone } from "@/lib/interfaces/theme";

export interface TradeOfferCardsProps {
  cards: (TradeOfferWantedCard | TradeOfferOfferedCard)[];
  prices: (number | null)[];
  priceSource: PriceSource;
}

export interface TradeOfferLibrarySectionProps {
  title: string;
  offers: TradeOffer[];
}

export type TradeOfferStatusTones = Record<TradeOfferStatus, StatusTone>;
