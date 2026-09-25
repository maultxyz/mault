import type {
  PlayingCard,
  PlayingCardPriceRange,
  ScannedCard,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tcgplayerPrices, tcgplayerProducts } from "../../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "./resolve";
import type { CardSearchAdapter, TcgplayerPricing } from "./types";

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

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function combineRanges(
  ranges: PlayingCardPriceRange[],
): PlayingCardPriceRange | undefined {
  if (ranges.length <= 1) return ranges[0];
  const present = (key: "low" | "mid" | "high") =>
    ranges.flatMap((r) => (r[key] != null ? [r[key]] : []));
  const lows = present("low");
  const highs = present("high");
  return {
    low: lows.length ? Math.min(...lows) : null,
    mid: median(present("mid")),
    high: highs.length ? Math.max(...highs) : null,
    printings: ranges.length,
  };
}

export async function applyTcgplayerPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  cards: T[],
): Promise<T[]> {
  const pricing = adapter.tcgplayer;
  if (!pricing) return cards;

  const productIdsByCard = await resolveProductIds(pricing, cards);
  const productIds = [...new Set(productIdsByCard.flat())];
  if (productIds.length === 0) return cards;

  const rows = await db
    .select({
      productId: tcgplayerPrices.productId,
      subType: tcgplayerPrices.subType,
      low: tcgplayerPrices.lowPrice,
      mid: tcgplayerPrices.midPrice,
      high: tcgplayerPrices.highPrice,
    })
    .from(tcgplayerPrices)
    .where(
      and(
        eq(tcgplayerPrices.categoryId, pricing.categoryId),
        inArray(tcgplayerPrices.productId, productIds),
      ),
    );
  const ranges = new Map<string, PlayingCardPriceRange>(
    rows.map(({ productId, subType, low, mid, high }) => [
      `${productId}:${subType}`,
      { low, mid, high },
    ]),
  );

  return cards.map((card, i) => {
    const cardProductIds = productIdsByCard[i];
    if (cardProductIds.length === 0) return card;

    const rangeFor = (subTypes: string[]) =>
      combineRanges(
        cardProductIds.flatMap((productId) => {
          const range = subTypes
            .map((subType) => ranges.get(`${productId}:${subType}`))
            .find((r) => r?.mid != null);
          return range ? [range] : [];
        }),
      );

    const subTypes = pricing.subTypes(card);
    const range = rangeFor(subTypes.price);
    const rangeFoil = rangeFor(subTypes.priceFoil);
    return {
      ...card,
      price: range?.mid ?? card.price,
      priceFoil: rangeFoil?.mid ?? card.priceFoil,
      priceRange: range ?? card.priceRange,
      priceRangeFoil: rangeFoil ?? card.priceRangeFoil,
    };
  });
}

export async function applyTcgplayerPricesToScans(
  gameKey: string | null | undefined,
  scans: ScannedCard[],
): Promise<ScannedCard[]> {
  const adapter = gameKey ? ADAPTERS_BY_GAME_KEY[gameKey] : undefined;
  if (!adapter) return scans;
  const cards = await applyTcgplayerPrices(
    adapter,
    scans.map((scan) => scan.card),
  );
  return scans.map((scan, i) => ({ ...scan, card: cards[i] }));
}
