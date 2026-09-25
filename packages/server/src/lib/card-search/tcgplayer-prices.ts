import type {
  PlayingCard,
  PlayingCardPriceRange,
  ScannedCard,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tcgplayerPrices } from "../../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "./resolve";
import type { CardSearchAdapter, TcgplayerPricing } from "./types";

function productIdOf(
  pricing: TcgplayerPricing,
  card: PlayingCard,
): number | null {
  const id = Number(card.tcgplayerId ?? pricing.productIdFromRaw?.(card));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Sets each card's price/priceFoil to the TCGplayer mid price from the daily
// tcgcsv sync, and priceRange/priceRangeFoil to its low/mid/high. The source
// API's own price stays in place wherever no synced price matches.
export async function applyTcgplayerPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  cards: T[],
): Promise<T[]> {
  const pricing = adapter.tcgplayer;
  if (!pricing) return cards;

  const productIds = [
    ...new Set(
      cards
        .map((card) => productIdOf(pricing, card))
        .filter((id) => id !== null),
    ),
  ];
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

  return cards.map((card) => {
    const productId = productIdOf(pricing, card);
    if (productId === null) return card;

    const firstRange = (subTypes: string[]) =>
      subTypes
        .map((subType) => ranges.get(`${productId}:${subType}`))
        .find((range) => range?.mid != null);

    const subTypes = pricing.subTypes(card);
    const range = firstRange(subTypes.price);
    const rangeFoil = firstRange(subTypes.priceFoil);
    return {
      ...card,
      price: range?.mid ?? card.price,
      priceFoil: rangeFoil?.mid ?? card.priceFoil,
      priceRange: range ?? card.priceRange,
      priceRangeFoil: rangeFoil ?? card.priceRangeFoil,
    };
  });
}

// Scan history keeps each card as it was at scan time, so prices are
// refreshed here whenever history is loaded rather than trusting the copy.
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
