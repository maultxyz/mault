import {
  CARD_PRICE_AT_SCAN_KEYS,
  DEFAULT_PRICE_SOURCE,
  PRICE_SOURCE_FIELDS,
  PRICE_SOURCES,
} from "./constants/price-source.constant";
import { conditionFactor } from "./card-condition";
import type {
  CardFinish,
  CardPricesAtScan,
  PlayingCard,
} from "./interfaces/card.interface";
import type {
  CardCondition,
  ConditionMultipliers,
} from "./interfaces/card-condition.interface";
import type {
  PriceChangeSinceScan,
  PriceSource,
} from "./interfaces/price-source.interface";

export function isPriceSource(value: unknown): value is PriceSource {
  return PRICE_SOURCES.includes(value as PriceSource);
}

export function toPriceSource(value: unknown): PriceSource {
  return isPriceSource(value) ? value : DEFAULT_PRICE_SOURCE;
}

export function toCardFinish(finish: boolean | CardFinish | null | undefined): CardFinish {
  return typeof finish === "object" && finish !== null ? finish : { isFoil: !!finish };
}

export function cardPriceFor(
  card: PlayingCard,
  finish: boolean | CardFinish | null | undefined,
  source: PriceSource,
  condition?: CardCondition | null,
  multipliers?: ConditionMultipliers,
): number | null {
  const { isFoil, foilType } = toCardFinish(finish);
  const fields = PRICE_SOURCE_FIELDS[source];
  const regular = card[fields.price] ?? null;
  const finishPrice =
    isFoil && foilType ? card.finishPrices?.[foilType]?.[fields.priceFoil] : null;
  const price = (isFoil ? (finishPrice ?? card[fields.priceFoil]) : regular) ?? regular;
  return price == null ? null : price * conditionFactor(condition, multipliers);
}

export function formatPrice(value: number, source: PriceSource): string {
  const { symbol, currency } = PRICE_SOURCE_FIELDS[source];
  return `${symbol}${value.toFixed(2)} ${currency}`;
}

export function cardPricesAtScan(savedCard: PlayingCard): CardPricesAtScan {
  const pricesAtScan: CardPricesAtScan = {};
  for (const key of CARD_PRICE_AT_SCAN_KEYS) {
    const value = savedCard[key];
    if (typeof value === "number") pricesAtScan[key] = value;
  }
  return pricesAtScan;
}

export function priceChangeSinceScan(
  priceAtScan: number | null | undefined,
  currentPrice: number | null | undefined,
): PriceChangeSinceScan | null {
  if (priceAtScan == null || currentPrice == null || priceAtScan <= 0) {
    return null;
  }
  const differenceInCents =
    Math.round(currentPrice * 100) - Math.round(priceAtScan * 100);
  if (differenceInCents === 0) return null;
  const direction = differenceInCents > 0 ? "up" : "down";
  const percent = Math.round(
    (Math.abs(currentPrice - priceAtScan) / priceAtScan) * 100,
  );
  return {
    percentLabel: `${direction === "up" ? "+" : "-"}${percent}%`,
    direction,
  };
}
