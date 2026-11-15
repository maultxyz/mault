import type {
  PriceLabelPricing,
  PriceLabelRoundingMode,
} from "./interfaces/price-labels.interface";

const CENTS_PER_UNIT = 100;
const QUARTER_CENTS = 25;

function roundCentsUp(cents: number, rounding: PriceLabelRoundingMode): number {
  switch (rounding) {
    case "quarter":
      return Math.ceil(cents / QUARTER_CENTS) * QUARTER_CENTS;
    case "whole":
      return Math.ceil(cents / CENTS_PER_UNIT) * CENTS_PER_UNIT;
    case "ninetyNine":
      return Math.ceil((cents + 1) / CENTS_PER_UNIT) * CENTS_PER_UNIT - 1;
    case "none":
      return cents;
  }
}

export function priceLabelPrice(
  marketPrice: number | null,
  pricing: PriceLabelPricing,
): number | null {
  if (marketPrice === null || !Number.isFinite(marketPrice)) return null;
  const markedUpCents = Math.round(
    marketPrice * CENTS_PER_UNIT * (1 + pricing.markupPercent / 100),
  );
  if (markedUpCents <= 0) return 0;
  return roundCentsUp(markedUpCents, pricing.rounding) / CENTS_PER_UNIT;
}
