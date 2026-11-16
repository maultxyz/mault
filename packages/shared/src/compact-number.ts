import {
  COMPACT_NUMBER_MIN_VALUE,
  COMPACT_NUMBER_UNITS,
  COMPACT_NUMBER_WHOLE_DIGITS_FROM,
  COMPACT_PRICE_LOCALE,
} from "./constants/compact-number.constant";
import { PRICE_SOURCE_FIELDS } from "./constants/price-source.constant";
import { formatPriceInCurrency } from "./price-source";

export function isCompactNumber(value: number): boolean {
  return Math.abs(value) >= COMPACT_NUMBER_MIN_VALUE;
}

export function formatCompactNumber(value: number, locale?: string): string {
  const magnitude = Math.abs(value);
  if (magnitude < COMPACT_NUMBER_MIN_VALUE) {
    return new Intl.NumberFormat(locale).format(value);
  }
  const sign = value < 0 ? "-" : "";
  for (let index = 0; index < COMPACT_NUMBER_UNITS.length; index++) {
    const unit = COMPACT_NUMBER_UNITS[index];
    const scaled = magnitude / unit.divisor;
    const fractionDigits = scaled >= COMPACT_NUMBER_WHOLE_DIGITS_FROM ? 0 : 1;
    const factor = 10 ** fractionDigits;
    const rounded = Math.round(scaled * factor) / factor;
    const isLastUnit = index === COMPACT_NUMBER_UNITS.length - 1;
    if (rounded < COMPACT_NUMBER_MIN_VALUE || isLastUnit) {
      const digits = new Intl.NumberFormat(locale, {
        maximumFractionDigits: fractionDigits,
      }).format(rounded);
      return `${sign}${digits}${unit.suffix}`;
    }
  }
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCompactPriceInCurrency(value: number, currency: string): string {
  if (!isCompactNumber(value)) return formatPriceInCurrency(value, currency);
  const symbol =
    Object.values(PRICE_SOURCE_FIELDS).find((fields) => fields.currency === currency)
      ?.symbol ?? "";
  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}${formatCompactNumber(Math.abs(value), COMPACT_PRICE_LOCALE)} ${currency}`;
}
