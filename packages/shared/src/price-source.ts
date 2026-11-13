import { DEFAULT_CARD_CONDITION } from "./constants/card-condition.constant";
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
  CardStampPrices,
  PlayingCard,
} from "./interfaces/card.interface";
import type {
  CardCondition,
  ConditionMultipliers,
} from "./interfaces/card-condition.interface";
import type {
  PriceChangeSinceScan,
  PriceSource,
  TcgplayerHeadlinePrices,
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

function stampPricesFor(
  card: Partial<Pick<PlayingCard, "stampPrices">>,
  stamp: string | null | undefined,
): CardStampPrices | null {
  return stamp ? (card.stampPrices?.[stamp] ?? null) : null;
}

export function tcgplayerConditionPriceFor(
  card: Partial<
    Pick<
      PlayingCard,
      "priceByCondition" | "priceFoilByCondition" | "finishPrices" | "stampPrices"
    >
  >,
  finish: boolean | CardFinish | null | undefined,
  condition: CardCondition | null | undefined,
): number | null {
  if (!condition || condition === DEFAULT_CARD_CONDITION) return null;
  const { isFoil, foilType, stamp } = toCardFinish(finish);
  const stampPrices = stampPricesFor(card, stamp);
  if (stampPrices) {
    const conditionPrices = isFoil
      ? stampPrices.priceFoilByCondition
      : stampPrices.priceByCondition;
    return conditionPrices?.[condition] ?? null;
  }
  if (!isFoil) return card.priceByCondition?.[condition] ?? null;
  const finishPrices = foilType ? card.finishPrices?.[foilType] : undefined;
  const conditionPrices = finishPrices
    ? finishPrices.priceFoilByCondition
    : card.priceFoilByCondition;
  return conditionPrices?.[condition] ?? null;
}

export function tcgplayerHeadlinePrices(
  card: PlayingCard,
  foilType: string | null | undefined,
  condition: CardCondition | null | undefined,
  stamp?: string | null,
): TcgplayerHeadlinePrices {
  const stampPrices = stampPricesFor(card, stamp);
  const conditionPrice = tcgplayerConditionPriceFor(
    card,
    { isFoil: false, stamp },
    condition,
  );
  const conditionFoilPrice = tcgplayerConditionPriceFor(
    card,
    { isFoil: true, foilType, stamp },
    condition,
  );
  return {
    price: conditionPrice ?? stampPrices?.price ?? card.price,
    foilPrice:
      conditionFoilPrice ??
      stampPrices?.priceFoil ??
      (foilType ? card.finishPrices?.[foilType]?.priceFoil : null) ??
      card.priceFoil,
    priceAtScan: conditionPrice == null ? (card.pricesAtScan?.price ?? null) : null,
    foilPriceAtScan:
      conditionFoilPrice == null ? (card.pricesAtScan?.priceFoil ?? null) : null,
    isConditionPrice: conditionPrice != null || conditionFoilPrice != null,
  };
}

export function cardPriceFor(
  card: CardPricesAtScan &
    Partial<
      Pick<
        PlayingCard,
        "finishPrices" | "priceByCondition" | "priceFoilByCondition" | "stampPrices"
      >
    >,
  finish: boolean | CardFinish | null | undefined,
  source: PriceSource,
  condition?: CardCondition | null,
  multipliers?: ConditionMultipliers,
): number | null {
  if (source === "tcgplayer") {
    const conditionPrice = tcgplayerConditionPriceFor(card, finish, condition);
    if (conditionPrice != null) return conditionPrice;
  }
  const { isFoil, foilType, stamp } = toCardFinish(finish);
  const stampPrices = source === "tcgplayer" ? stampPricesFor(card, stamp) : null;
  const stampPrice = stampPrices
    ? (isFoil ? stampPrices.priceFoil : stampPrices.price)
    : null;
  if (stampPrice != null) {
    return stampPrice * conditionFactor(condition, multipliers);
  }
  const fields = PRICE_SOURCE_FIELDS[source];
  const regular = card[fields.price] ?? null;
  const finishPrice =
    isFoil && foilType ? card.finishPrices?.[foilType]?.[fields.priceFoil] : null;
  const price = (isFoil ? (finishPrice ?? card[fields.priceFoil]) : regular) ?? regular;
  return price == null ? null : price * conditionFactor(condition, multipliers);
}

export function cardPriceAtScanFor(
  card: PlayingCard,
  finish: boolean | CardFinish | null | undefined,
  source: PriceSource,
  condition?: CardCondition | null,
  multipliers?: ConditionMultipliers,
): number | null {
  return card.pricesAtScan
    ? cardPriceFor(card.pricesAtScan, finish, source, condition, multipliers)
    : null;
}

export function formatPrice(value: number, source: PriceSource): string {
  return formatPriceInCurrency(value, PRICE_SOURCE_FIELDS[source].currency);
}

export function formatPriceInCurrency(value: number, currency: string): string {
  const symbol =
    Object.values(PRICE_SOURCE_FIELDS).find((fields) => fields.currency === currency)
      ?.symbol ?? "";
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
