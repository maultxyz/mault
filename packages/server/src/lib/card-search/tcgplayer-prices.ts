import {
  CARD_CONDITIONS,
  type CardConditionPrices,
  type CardFinishPrices,
  type CardStampPrices,
  type PlayingCard,
  type PlayingCardPriceRange,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tcgplayerPrices, tcgplayerProducts, tcgplayerSkus } from "../../db/schema";
import {
  TCGPLAYER_SKU_CONDITION_PRICE_COLUMNS,
  TCGTRACKING_SKU_LANGUAGE_CODES,
} from "../constants/tcgtracking";
import type {
  CardSearchAdapter,
  TcgplayerFinishProduct,
  TcgplayerPricing,
  TcgplayerStampProduct,
  TcgplayerSubTypes,
} from "../interfaces/card-search";
import { median } from "../statistics";

export function tcgplayerProductIdOf(
  pricing: TcgplayerPricing,
  card: PlayingCard,
): number | null {
  const id = Number(card.tcgplayerId ?? pricing.productIdFromRaw?.(card));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function skuLanguageCode(language: string): string {
  const normalized = language.toLowerCase();
  return TCGTRACKING_SKU_LANGUAGE_CODES[normalized] ?? normalized.toUpperCase();
}

async function resolveProductIds(
  pricing: TcgplayerPricing,
  cards: PlayingCard[],
): Promise<number[][]> {
  const direct = cards.map((card) => tcgplayerProductIdOf(pricing, card));
  const matches = cards.map((card, i) =>
    direct[i] === null ? (pricing.productMatch?.(card) ?? null) : null,
  );

  const numbers = [...new Set(matches.flatMap((m) => m?.numbers ?? []))];
  const candidates =
    numbers.length === 0
      ? []
      : await db
          .select({
            productId: tcgplayerProducts.productId,
            number: tcgplayerProducts.number,
            name: tcgplayerProducts.name,
            rarity: tcgplayerProducts.rarity,
          })
          .from(tcgplayerProducts)
          .where(
            and(
              eq(tcgplayerProducts.categoryId, pricing.categoryId),
              inArray(tcgplayerProducts.number, numbers),
            ),
          );
  const byNumber = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const key = candidate.number ?? "";
    byNumber.set(key, [...(byNumber.get(key) ?? []), candidate]);
  }

  return cards.map((_, i) => {
    const id = direct[i];
    if (id !== null) return [id];
    const match = matches[i];
    if (!match) return [];
    const ids = match.numbers
      .flatMap((number) => byNumber.get(number) ?? [])
      .filter((product) => match.accepts(product))
      .map((product) => product.productId);
    return [...new Set(ids)];
  });
}

function combineRanges(
  ranges: PlayingCardPriceRange[],
): PlayingCardPriceRange | undefined {
  if (ranges.length <= 1) return ranges[0];
  const present = (key: "low" | "mid" | "high" | "market") =>
    ranges.flatMap((r) => (r[key] != null ? [r[key]] : []));
  const lows = present("low");
  const highs = present("high");
  return {
    low: lows.length ? Math.min(...lows) : null,
    mid: median(present("mid")),
    high: highs.length ? Math.max(...highs) : null,
    market: median(present("market")),
    printings: ranges.length,
  };
}

function combineConditionPrices(
  prices: CardConditionPrices[],
): CardConditionPrices | undefined {
  if (prices.length <= 1) return prices[0];
  const entries = CARD_CONDITIONS.flatMap((condition) => {
    const value = median(prices.flatMap((price) => price[condition] ?? []));
    return value == null ? [] : [[condition, value] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function finishPricesFor(
  finishes: TcgplayerFinishProduct[],
  rangeOf: (productId: number, subTypes: string[]) => PlayingCardPriceRange | undefined,
  conditionPricesOf: (productId: number, subTypes: string[]) => CardConditionPrices | undefined,
): Record<string, CardFinishPrices> | undefined {
  const entries = finishes.flatMap((finish) => {
    const range = rangeOf(finish.productId, finish.subTypes);
    const priceFoil = range?.market ?? range?.mid ?? null;
    if (priceFoil == null) return [];
    const priceFoilByCondition = conditionPricesOf(finish.productId, finish.subTypes);
    return [
      [finish.foilType, priceFoilByCondition ? { priceFoil, priceFoilByCondition } : { priceFoil }] as const,
    ];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function stampPricesFor(
  stamps: TcgplayerStampProduct[],
  rangeOf: (productId: number, subTypes: string[]) => PlayingCardPriceRange | undefined,
  conditionPricesOf: (productId: number, subTypes: string[]) => CardConditionPrices | undefined,
): Record<string, CardStampPrices> | undefined {
  const pricesByStamp: Record<string, CardStampPrices> = {};
  for (const stampProduct of stamps) {
    const range = rangeOf(stampProduct.productId, stampProduct.subTypes);
    const marketPrice = range?.market ?? range?.mid ?? null;
    if (marketPrice == null) continue;
    const conditionPrices = conditionPricesOf(
      stampProduct.productId,
      stampProduct.subTypes,
    );
    const prices = pricesByStamp[stampProduct.stamp] ?? {};
    if (stampProduct.isFoil) {
      prices.priceFoil = marketPrice;
      if (conditionPrices) prices.priceFoilByCondition = conditionPrices;
    } else {
      prices.price = marketPrice;
      if (conditionPrices) prices.priceByCondition = conditionPrices;
    }
    pricesByStamp[stampProduct.stamp] = prices;
  }
  return Object.keys(pricesByStamp).length > 0 ? pricesByStamp : undefined;
}

export function foilOnlyFoilTypeOf(
  pricing: Pick<TcgplayerPricing, "foilTypeOfVariant">,
  catalogedSkuVariants: ReadonlySet<string>,
  subTypes: TcgplayerSubTypes,
): string | undefined {
  const nonFoilSubTypes = subTypes.price.filter(
    (subType) => !subTypes.priceFoil.includes(subType),
  );
  if (nonFoilSubTypes.some((subType) => catalogedSkuVariants.has(subType))) {
    return undefined;
  }
  const foilSubType = subTypes.priceFoil.find((subType) =>
    catalogedSkuVariants.has(subType),
  );
  if (!foilSubType) return undefined;
  return pricing.foilTypeOfVariant?.(foilSubType) ?? foilSubType;
}

function medianFinishPrice(
  finishPrices: Record<string, CardFinishPrices> | undefined,
): number | null {
  if (!finishPrices) return null;
  return median(
    Object.values(finishPrices).flatMap((prices) =>
      prices.priceFoil == null ? [] : [prices.priceFoil],
    ),
  );
}

export async function applyTcgplayerPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  cards: T[],
): Promise<T[]> {
  const pricing = adapter.tcgplayer;
  if (!pricing) return cards;

  const productIdsByCard = await resolveProductIds(pricing, cards);
  const finishProductsByCard = cards.map(
    (card) => pricing.finishProducts?.(card) ?? [],
  );
  const stampProductsByCard = cards.map(
    (card) => pricing.stampProducts?.(card) ?? [],
  );
  const productIds = [
    ...new Set([
      ...productIdsByCard.flat(),
      ...finishProductsByCard.flat().map((finish) => finish.productId),
      ...stampProductsByCard.flat().map((stamp) => stamp.productId),
    ]),
  ];
  if (productIds.length === 0) return cards;

  const rows = await db
    .select({
      productId: tcgplayerPrices.productId,
      subType: tcgplayerPrices.subType,
      low: tcgplayerPrices.lowPrice,
      mid: tcgplayerPrices.midPrice,
      high: tcgplayerPrices.highPrice,
      market: tcgplayerPrices.marketPrice,
    })
    .from(tcgplayerPrices)
    .where(
      and(
        eq(tcgplayerPrices.categoryId, pricing.categoryId),
        inArray(tcgplayerPrices.productId, productIds),
      ),
    );
  const ranges = new Map<string, PlayingCardPriceRange>(
    rows.map(({ productId, subType, low, mid, high, market }) => [
      `${productId}:${subType}`,
      { low, mid, high, market },
    ]),
  );

  const rangeOf = (productId: number, subTypes: string[]) =>
    subTypes
      .map((subType) => ranges.get(`${productId}:${subType}`))
      .find((r) => r?.market != null || r?.mid != null);

  const skuRows = await db
    .select()
    .from(tcgplayerSkus)
    .where(
      and(
        eq(tcgplayerSkus.categoryId, pricing.categoryId),
        inArray(tcgplayerSkus.productId, productIds),
      ),
    );
  const conditionPricesByKey = new Map<string, CardConditionPrices>();
  const skuVariantsByProductLanguage = new Map<string, Set<string>>();
  for (const row of skuRows) {
    const productLanguageKey = `${row.productId}:${row.language}`;
    const variants = skuVariantsByProductLanguage.get(productLanguageKey) ?? new Set<string>();
    variants.add(row.variant);
    skuVariantsByProductLanguage.set(productLanguageKey, variants);
    const entries = CARD_CONDITIONS.flatMap((condition) => {
      const price = row[TCGPLAYER_SKU_CONDITION_PRICE_COLUMNS[condition]];
      return price == null ? [] : [[condition, price] as const];
    });
    if (entries.length > 0) {
      conditionPricesByKey.set(
        `${row.productId}:${row.variant}:${row.language}`,
        Object.fromEntries(entries),
      );
    }
  }

  return cards.map((card, i) => {
    const cardProductIds = productIdsByCard[i];
    const languageCode = skuLanguageCode(card.lang ?? "en");
    const conditionPricesOf = (productId: number, subTypes: string[]) =>
      subTypes
        .map((subType) => conditionPricesByKey.get(`${productId}:${subType}:${languageCode}`))
        .find((prices) => prices != null);
    const finishPrices = finishPricesFor(finishProductsByCard[i], rangeOf, conditionPricesOf);
    const stampPrices = stampPricesFor(stampProductsByCard[i], rangeOf, conditionPricesOf);
    if (cardProductIds.length === 0 && !finishPrices && !stampPrices) return card;

    const rangeFor = (subTypes: string[]) =>
      combineRanges(
        cardProductIds.flatMap((productId) => {
          const range = rangeOf(productId, subTypes);
          return range ? [range] : [];
        }),
      );
    const conditionPricesFor = (subTypes: string[]) =>
      combineConditionPrices(
        cardProductIds.flatMap((productId) => conditionPricesOf(productId, subTypes) ?? []),
      );

    const subTypes = pricing.subTypes(card);
    const range = rangeFor(subTypes.price);
    const rangeFoil = rangeFor(subTypes.priceFoil);
    return {
      ...card,
      price: range?.market ?? range?.mid ?? card.price,
      priceFoil:
        rangeFoil?.market ??
        rangeFoil?.mid ??
        medianFinishPrice(finishPrices) ??
        card.priceFoil,
      priceRange: range ?? card.priceRange,
      priceRangeFoil: rangeFoil ?? card.priceRangeFoil,
      finishPrices: finishPrices ?? card.finishPrices,
      stampPrices: stampPrices ?? card.stampPrices,
      priceByCondition: conditionPricesFor(subTypes.price) ?? card.priceByCondition,
      priceFoilByCondition:
        conditionPricesFor(subTypes.priceFoil) ?? card.priceFoilByCondition,
      foilOnlyFoilType:
        card.foilOnlyFoilType ??
        foilOnlyFoilTypeOf(
          pricing,
          new Set(
            cardProductIds.flatMap((productId) => [
              ...(skuVariantsByProductLanguage.get(`${productId}:${languageCode}`) ?? []),
            ]),
          ),
          subTypes,
        ),
    };
  });
}
