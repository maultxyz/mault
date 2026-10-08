import type {
  PlayingCard,
  PlayingCardCardKingdomPrice,
} from "@magic-vault/shared";
import { inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardKingdomPrices } from "../../db/schema";
import type { CardSearchAdapter } from "../interfaces/card-search";
import type { CardKingdomPriceRow } from "../interfaces/cardkingdom";

export function cardKingdomNumber(number: string): string {
  return number
    .trim()
    .toLowerCase()
    .replace(/^0+(?=.)/, "");
}

function printingKey(setCode: string, number: string): string {
  return `${setCode.toLowerCase()}:${cardKingdomNumber(number)}`;
}

function toPrice(row: CardKingdomPriceRow): PlayingCardCardKingdomPrice {
  return {
    retail: row.retail,
    buylist: row.buylist,
    inStock: row.retailQty,
    url: row.url,
  };
}

function pickRow(
  rows: CardKingdomPriceRow[],
  card: PlayingCard,
  isFoil: boolean,
): CardKingdomPriceRow | undefined {
  const candidates = rows.filter(
    (row) =>
      row.isFoil === isFoil && (row.retail != null || row.buylist != null),
  );
  const setCode = card.set.toLowerCase();
  return candidates.find((row) => row.setCode === setCode) ?? candidates[0];
}

export async function applyCardKingdomPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  cards: T[],
): Promise<T[]> {
  const pricing = adapter.cardkingdom;
  if (!pricing || cards.length === 0) return cards;

  const scryfallIds = cards.map(
    (card) => pricing.scryfallIdFromRaw(card) ?? null,
  );
  const ids = [...new Set(scryfallIds.filter((id): id is string => !!id))];
  const printings = [
    ...new Map(
      cards.map((card) => {
        const setCode = card.set.toLowerCase();
        const number = cardKingdomNumber(card.collectorNumber);
        return [printingKey(setCode, number), sql`(${setCode}, ${number})`];
      }),
    ).values(),
  ];

  const rows = await db
    .select()
    .from(cardKingdomPrices)
    .where(
      or(
        ids.length > 0 ? inArray(cardKingdomPrices.scryfallId, ids) : undefined,
        sql`(${cardKingdomPrices.setCode}, ${cardKingdomPrices.number}) IN (${sql.join(printings, sql`, `)})`,
      ),
    );
  if (rows.length === 0) return cards;

  const byScryfallId = new Map<string, CardKingdomPriceRow[]>();
  const byPrinting = new Map<string, CardKingdomPriceRow[]>();
  for (const row of rows) {
    if (row.scryfallId) {
      byScryfallId.set(row.scryfallId, [
        ...(byScryfallId.get(row.scryfallId) ?? []),
        row,
      ]);
    }
    const key = printingKey(row.setCode, row.number);
    byPrinting.set(key, [...(byPrinting.get(key) ?? []), row]);
  }

  return cards.map((card, i) => {
    const id = scryfallIds[i];
    const matched =
      (id ? byScryfallId.get(id) : undefined) ??
      byPrinting.get(printingKey(card.set, card.collectorNumber)) ??
      [];
    const regular = pickRow(matched, card, false);
    const foil = pickRow(matched, card, true);
    if (!regular && !foil) return card;
    return {
      ...card,
      priceCardKingdom: regular?.retail ?? card.priceCardKingdom,
      priceCardKingdomFoil: foil?.retail ?? card.priceCardKingdomFoil,
      cardKingdomPrice: regular ? toPrice(regular) : card.cardKingdomPrice,
      cardKingdomPriceFoil: foil ? toPrice(foil) : card.cardKingdomPriceFoil,
    };
  });
}
