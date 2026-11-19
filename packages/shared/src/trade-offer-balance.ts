import type {
  InPersonTradeCash,
  TradeOfferBalance,
  TradeOfferQuote,
} from "./interfaces/trade-offers.interface";

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function tradeOfferGuestBalance(
  quote: TradeOfferQuote,
  offeredCashAmount: number | null,
): TradeOfferBalance {
  const getValue = roundToCents(quote.wantedValue);
  const giveValue = roundToCents(quote.offeredCardsValue + (offeredCashAmount ?? 0));
  return {
    getValue,
    giveValue,
    difference: roundToCents(giveValue - getValue),
    hasMissingPrices:
      quote.wantedPrices.some((price) => price == null) ||
      quote.offeredPrices.some((price) => price == null),
  };
}

export function inPersonTradeBalance(quote: TradeOfferQuote, cash: InPersonTradeCash | null): TradeOfferBalance {
  const getValue = roundToCents(quote.offeredCardsValue + (cash?.direction === "received" ? cash.amount : 0));
  const giveValue = roundToCents(quote.wantedValue + (cash?.direction === "given" ? cash.amount : 0));
  return {
    getValue,
    giveValue,
    difference: roundToCents(giveValue - getValue),
    hasMissingPrices:
      quote.wantedPrices.some((price) => price == null) ||
      quote.offeredPrices.some((price) => price == null),
  };
}
