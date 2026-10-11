import {
  DEFAULT_PRICE_SOURCE,
  PRICE_SOURCE_FIELDS,
  PRICE_SOURCES,
} from "./constants/price-source.constant";
import { conditionFactor } from "./card-condition";
import type { PlayingCard } from "./interfaces/card.interface";
import type {
  CardCondition,
  ConditionMultipliers,
} from "./interfaces/card-condition.interface";
import type { PriceSource } from "./interfaces/price-source.interface";

export function isPriceSource(value: unknown): value is PriceSource {
  return PRICE_SOURCES.includes(value as PriceSource);
}

export function toPriceSource(value: unknown): PriceSource {
  return isPriceSource(value) ? value : DEFAULT_PRICE_SOURCE;
}

export function cardPriceFor(
  card: PlayingCard,
  isFoil: boolean | undefined,
  source: PriceSource,
  condition?: CardCondition | null,
  multipliers?: ConditionMultipliers,
): number | null {
  const fields = PRICE_SOURCE_FIELDS[source];
  const regular = card[fields.price] ?? null;
  const price = (isFoil ? card[fields.priceFoil] : regular) ?? regular;
  return price == null ? null : price * conditionFactor(condition, multipliers);
}

export function formatPrice(value: number, source: PriceSource): string {
  const { symbol, currency } = PRICE_SOURCE_FIELDS[source];
  return `${symbol}${value.toFixed(2)} ${currency}`;
}
