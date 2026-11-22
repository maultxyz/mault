import type {
  PriceLabelRoundingMode,
} from "./interfaces/price-labels.interface";

const CENTS_PER_UNIT = 100;
const QUARTER_CENTS = 25;

export function roundPriceUp(price: number, rounding: PriceLabelRoundingMode): number {
  const cents = Math.round(price * CENTS_PER_UNIT);
  if (cents <= 0) return 0;
  return roundCentsUp(cents, rounding) / CENTS_PER_UNIT;
}

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
