import type {
  PlayingCard,
  PlayingCardCardmarketPrice,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cardmarketPrices, cardmarketProducts } from "../../db/schema";
import type { CardSearchAdapter, CardmarketPricing } from "../interfaces/card-search";

export function cardmarketMatchName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function directProductId(
  pricing: CardmarketPricing,
  card: PlayingCard,
): number | null {
  const id = Number(pricing.productIdFromRaw?.(card));
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function resolveProductIds(
  pricing: CardmarketPricing,
  cards: PlayingCard[],
): Promise<number[][]> {
  const direct = cards.map((card) => directProductId(pricing, card));
  const namesByCard = cards.map((card, i) =>
    direct[i] === null
      ? (pricing.productNames?.(card) ?? [])
          .map(cardmarketMatchName)
          .filter(Boolean)
      : [],
  );

  const names = [...new Set(namesByCard.flat())];
  const candidates =
    names.length === 0
      ? []
      : await db
          .select({
            productId: cardmarketProducts.productId,
            matchName: cardmarketProducts.matchName,
          })
          .from(cardmarketProducts)
          .where(
            and(
              eq(cardmarketProducts.gameId, pricing.gameId),
              inArray(cardmarketProducts.matchName, names),
            ),
          );
  const byName = new Map<string, number[]>();
  for (const { productId, matchName } of candidates) {
    byName.set(matchName, [...(byName.get(matchName) ?? []), productId]);
  }

  return cards.map((_, i) => {
    const id = direct[i];
    if (id !== null) return [id];
    return namesByCard[i].map((name) => byName.get(name)).find(Boolean) ?? [];
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function combinePrices(
  prices: PlayingCardCardmarketPrice[],
): PlayingCardCardmarketPrice | undefined {
  if (prices.length <= 1) return prices[0];
  const present = (key: "low" | "trend" | "avg30") =>
    prices.flatMap((p) => (p[key] != null ? [p[key]] : []));
  const lows = present("low");
  return {
    low: lows.length ? Math.min(...lows) : null,
    trend: median(present("trend")),
    avg30: median(present("avg30")),
    printings: prices.length,
  };
}

function hasPrice(price: PlayingCardCardmarketPrice): boolean {
  return price.trend != null || price.low != null;
}

export async function applyCardmarketPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  cards: T[],
): Promise<T[]> {
  const pricing = adapter.cardmarket;
  if (!pricing) return cards;

  const productIdsByCard = await resolveProductIds(pricing, cards);
  const productIds = [...new Set(productIdsByCard.flat())];
  if (productIds.length === 0) return cards;

  const rows = await db
    .select()
    .from(cardmarketPrices)
    .where(inArray(cardmarketPrices.productId, productIds));
  const byProduct = new Map(rows.map((row) => [row.productId, row]));

  return cards.map((card, i) => {
    const products = productIdsByCard[i].flatMap((productId) => {
      const row = byProduct.get(productId);
      return row ? [row] : [];
    });
    if (products.length === 0) return card;

    const regular = combinePrices(
      products
        .map((row) => ({ low: row.low, trend: row.trend, avg30: row.avg30 }))
        .filter(hasPrice),
    );
    const foil = combinePrices(
      products
        .map((row) => ({
          low: row.lowFoil,
          trend: row.trendFoil,
          avg30: row.avg30Foil,
        }))
        .filter(hasPrice),
    );
    return {
      ...card,
      priceEur: regular?.trend ?? card.priceEur,
      priceEurFoil: foil?.trend ?? card.priceEurFoil,
      cardmarketPrice: regular ?? card.cardmarketPrice,
      cardmarketPriceFoil: foil ?? card.cardmarketPriceFoil,
    };
  });
}
