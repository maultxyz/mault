import { TRADE_OFFER_CASH_INPUT_PATTERN } from "./constants/trade-offers.constant";
import type {
  PublicTradeOffer,
  TradeOfferCash,
  TradeOfferOfferKind,
} from "./interfaces/trade-offers.interface";
import { formatPriceInCurrency } from "./price-source";

export function parseTradeOfferCashInput(value: string): number | null {
  const trimmed = value.trim();
  if (!TRADE_OFFER_CASH_INPUT_PATTERN.test(trimmed)) return null;
  const amount = Math.round(Number(trimmed.replace(",", ".")) * 100) / 100;
  return amount > 0 ? amount : null;
}

export function tradeOfferOfferedCardCount(offer: Pick<PublicTradeOffer, "offered">): number {
  return offer.offered.reduce((sum, card) => sum + card.quantity, 0);
}

export function tradeOfferOfferedCash(offer: Pick<PublicTradeOffer, "offeredCash">): TradeOfferCash | null {
  return offer.offeredCash && offer.offeredCash.amount > 0 ? offer.offeredCash : null;
}

export function tradeOfferOfferKind(
  offer: Pick<PublicTradeOffer, "offered" | "offeredCash">,
): TradeOfferOfferKind {
  const hasCards = offer.offered.length > 0;
  const hasCash = tradeOfferOfferedCash(offer) != null;
  if (hasCards && hasCash) return "cardsAndCash";
  if (hasCash) return "cash";
  return hasCards ? "cards" : "nothing";
}

export function formatTradeOfferCash(cash: TradeOfferCash): string {
  return formatPriceInCurrency(cash.amount, cash.currency);
}

export function tradeOfferMessageValues(
  offer: Pick<PublicTradeOffer, "wanted" | "offered" | "offeredCash">,
): { wanted: number; offered: number; count: number; cash: string } {
  const cash = tradeOfferOfferedCash(offer);
  const offered = tradeOfferOfferedCardCount(offer);
  return {
    wanted: offer.wanted.length,
    offered,
    count: offered,
    cash: cash ? formatTradeOfferCash(cash) : "",
  };
}
