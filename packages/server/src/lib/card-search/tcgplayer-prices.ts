import type {
  CardFinishPrices,
  PlayingCard,
  PlayingCardPriceRange,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tcgplayerPrices, tcgplayerProducts } from "../../db/schema";
import type {
  CardSearchAdapter,
  TcgplayerFinishProduct,
  TcgplayerPricing,
} from "../interfaces/card-search";
import { median } from "../statistics";

function productIdOf(
  pricing: TcgplayerPricing,
  card: PlayingCard,
): number | null {
  const id = Number(card.tcgplayerId ?? pricing.productIdFromRaw?.(card));
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function resolveProductIds(
  pricing: TcgplayerPricing,
  cards: PlayingCard[],
): Promise<number[][]> {
  const direct = cards.map((card) => productIdOf(pricing, card));
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

function finishPricesFor(
  finishes: TcgplayerFinishProduct[],
  rangeOf: (productId: number, subTypes: string[]) => PlayingCardPriceRange | undefined,
): Record<string, CardFinishPrices> | undefined {
  const entries = finishes.flatMap((finish) => {
    const range = rangeOf(finish.productId, finish.subTypes);
    const priceFoil = range?.market ?? range?.mid ?? null;
    return priceFoil == null ? [] : [[finish.foilType, { priceFoil }] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
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
  const productIds = [
    ...new Set([
      ...productIdsByCard.flat(),
      ...finishProductsByCard.flat().map((finish) => finish.productId),
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

  return cards.map((card, i) => {
    const cardProductIds = productIdsByCard[i];
    const finishPrices = finishPricesFor(finishProductsByCard[i], rangeOf);
    if (cardProductIds.length === 0 && !finishPrices) return card;

    const rangeFor = (subTypes: string[]) =>
      combineRanges(
        cardProductIds.flatMap((productId) => {
          const range = rangeOf(productId, subTypes);
          return range ? [range] : [];
        }),
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
    };
  });
}
