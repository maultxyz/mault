import type { TradeOfferCardStackCard } from "@/lib/interfaces/trade-offers";
import type {
  TradeOfferOfferedCard,
  TradeOfferStatus,
  TradeOfferWantedCard,
} from "@magic-vault/shared";

export function wantedStackCards(cards: TradeOfferWantedCard[]): TradeOfferCardStackCard[] {
  return cards.map((card) => ({ key: card.scanId, name: card.name, imageUrl: card.imageUrl }));
}

export function offeredStackCards(cards: TradeOfferOfferedCard[]): TradeOfferCardStackCard[] {
  return cards.map((card, index) => ({
    key: `${card.gameKey}-${card.lang}-${card.cardId}-${index}`,
    name: card.name,
    imageUrl: card.imageUrl,
  }));
}

export function offeredCardCount(cards: TradeOfferOfferedCard[]): number {
  return cards.reduce((sum, card) => sum + card.quantity, 0);
}

export function isUnpricedTradeSide(prices: (number | null)[], value: number): boolean {
  return prices.length > 0 && value === 0 && prices.every((price) => price == null);
}

export function countTradeOffersWithStatus(
  offers: { status: TradeOfferStatus }[],
  status: TradeOfferStatus,
): number {
  return offers.filter((offer) => offer.status === status).length;
}
