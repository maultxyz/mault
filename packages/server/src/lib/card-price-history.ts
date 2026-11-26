import {
  addDaysToUtcDay,
  CARD_PRICE_HISTORY_MAX_DAYS,
  utcDayOf,
  type CardPriceHistoryPoint,
} from "@magic-vault/shared";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { cardPriceHistory } from "../db/schema";
import type {
  CardPriceHistoryKey,
  CardPriceHistoryRow,
  CardPriceHistoryWriter,
  ChangedCardPrices,
} from "./interfaces/card-price-history";

const toCents = (price: number | null) =>
  price == null ? null : Math.round(price * 100);

const fromCents = (cents: number | null) => (cents == null ? null : cents / 100);

function toPoint(row: CardPriceHistoryRow): CardPriceHistoryPoint {
  return {
    day: row.day,
    price: fromCents(row.priceCents),
    priceFoil: fromCents(row.priceFoilCents),
    priceEur: fromCents(row.priceEurCents),
    priceEurFoil: fromCents(row.priceEurFoilCents),
    priceCardKingdom: fromCents(row.priceCardKingdomCents),
    priceCardKingdomFoil: fromCents(row.priceCardKingdomFoilCents),
  };
}

export async function recordCardPriceHistory(
  writer: CardPriceHistoryWriter,
  changedPrices: ChangedCardPrices[],
  recordedAt = new Date(),
): Promise<void> {
  if (changedPrices.length === 0) return;
  const day = utcDayOf(recordedAt);
  await writer
    .insert(cardPriceHistory)
    .values(
      changedPrices.map((prices) => ({
        gameKey: prices.gameKey,
        lang: prices.lang,
        cardId: prices.cardId,
        day,
        priceCents: toCents(prices.price),
        priceFoilCents: toCents(prices.priceFoil),
        priceEurCents: toCents(prices.priceEur),
        priceEurFoilCents: toCents(prices.priceEurFoil),
        priceCardKingdomCents: toCents(prices.priceCardKingdom),
        priceCardKingdomFoilCents: toCents(prices.priceCardKingdomFoil),
      })),
    )
    .onConflictDoUpdate({
      target: [
        cardPriceHistory.gameKey,
        cardPriceHistory.lang,
        cardPriceHistory.cardId,
        cardPriceHistory.day,
      ],
      set: {
        priceCents: sql`excluded.price_cents`,
        priceFoilCents: sql`excluded.price_foil_cents`,
        priceEurCents: sql`excluded.price_eur_cents`,
        priceEurFoilCents: sql`excluded.price_eur_foil_cents`,
        priceCardKingdomCents: sql`excluded.price_card_kingdom_cents`,
        priceCardKingdomFoilCents: sql`excluded.price_card_kingdom_foil_cents`,
      },
    });
}

export async function loadCardPriceHistory(
  { gameKey, lang, cardId }: CardPriceHistoryKey,
  today = new Date(),
): Promise<CardPriceHistoryPoint[]> {
  const windowStart = addDaysToUtcDay(
    utcDayOf(today),
    -(CARD_PRICE_HISTORY_MAX_DAYS - 1),
  );
  const ofCard = and(
    eq(cardPriceHistory.gameKey, gameKey),
    eq(cardPriceHistory.lang, lang),
    eq(cardPriceHistory.cardId, cardId),
  );
  const inWindow = await db
    .select()
    .from(cardPriceHistory)
    .where(and(ofCard, gte(cardPriceHistory.day, windowStart)))
    .orderBy(asc(cardPriceHistory.day));
  const beforeWindow =
    inWindow[0]?.day === windowStart
      ? []
      : await db
          .select()
          .from(cardPriceHistory)
          .where(and(ofCard, lt(cardPriceHistory.day, windowStart)))
          .orderBy(desc(cardPriceHistory.day))
          .limit(1);
  return [...beforeWindow, ...inWindow].map(toPoint);
}
