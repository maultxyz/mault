import type { PlayingCard } from "@magic-vault/shared";
import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { cardImageVectors, cardPrices } from "../db/schema";
import { resolveLiveCardPrices } from "./card-search/card-prices";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import {
  CARD_PRICE_DETAIL_KEYS,
  CARD_PRICE_REFRESH_BATCH_SIZE,
} from "./constants/card-prices";
import type {
  CardPriceDetails,
  CardPriceRefreshOptions,
} from "./interfaces/card-prices";

function detailsOf(card: PlayingCard): CardPriceDetails | null {
  const entries = CARD_PRICE_DETAIL_KEYS.flatMap((key) =>
    card[key] == null ? [] : [[key, card[key]]],
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

const MISSING_PRICE_ROW = sql`NOT EXISTS (
  SELECT 1 FROM ${cardPrices}
  WHERE ${cardPrices.gameKey} = ${cardImageVectors.gameKey}
    AND ${cardPrices.lang} = ${cardImageVectors.lang}
    AND ${cardPrices.cardId} = ${cardImageVectors.cardId}
)`;

const PRICES_CHANGED = sql`(
  ${cardPrices.price}, ${cardPrices.priceFoil}, ${cardPrices.priceEur},
  ${cardPrices.priceEurFoil}, ${cardPrices.details}
) IS DISTINCT FROM (
  excluded.price, excluded.price_foil, excluded.price_eur,
  excluded.price_eur_foil, excluded.details
)`;

export async function refreshCardPrices({
  log,
  onlyMissing,
}: CardPriceRefreshOptions): Promise<number> {
  let total = 0;
  for (const [gameKey, adapter] of Object.entries(ADAPTERS_BY_GAME_KEY)) {
    if (!adapter.tcgplayer && !adapter.cardmarket) continue;

    let written = 0;
    let lastId = 0;
    for (;;) {
      const rows = await db
        .select({
          id: cardImageVectors.id,
          cardId: cardImageVectors.cardId,
          lang: cardImageVectors.lang,
          data: cardImageVectors.data,
        })
        .from(cardImageVectors)
        .where(
          and(
            eq(cardImageVectors.gameKey, gameKey),
            isNotNull(cardImageVectors.data),
            gt(cardImageVectors.id, lastId),
            onlyMissing ? MISSING_PRICE_ROW : undefined,
          ),
        )
        .orderBy(asc(cardImageVectors.id))
        .limit(CARD_PRICE_REFRESH_BATCH_SIZE);
      if (rows.length === 0) break;
      lastId = rows[rows.length - 1].id;

      const normalized = rows.flatMap((row) => {
        const card = adapter.normalizeStored(row.data, row.cardId, row.lang);
        return card ? [{ row, card }] : [];
      });
      if (normalized.length === 0) continue;

      const priced = await resolveLiveCardPrices(
        adapter,
        normalized.map(({ card }) => card),
      );
      const values = normalized.map(({ row }, i) => ({
        gameKey,
        lang: row.lang,
        cardId: row.cardId,
        price: priced[i].price ?? null,
        priceFoil: priced[i].priceFoil ?? null,
        priceEur: priced[i].priceEur ?? null,
        priceEurFoil: priced[i].priceEurFoil ?? null,
        details: detailsOf(priced[i]),
      }));

      const changed = await db
        .insert(cardPrices)
        .values(values)
        .onConflictDoUpdate({
          target: [cardPrices.gameKey, cardPrices.lang, cardPrices.cardId],
          set: {
            price: sql`excluded.price`,
            priceFoil: sql`excluded.price_foil`,
            priceEur: sql`excluded.price_eur`,
            priceEurFoil: sql`excluded.price_eur_foil`,
            details: sql`excluded.details`,
            updatedAt: new Date(),
          },
          setWhere: PRICES_CHANGED,
        })
        .returning({ cardId: cardPrices.cardId });
      written += changed.length;
    }

    total += written;
    log(
      `${gameKey}: ${written} card prices ${onlyMissing ? "added" : "added or changed"}.`,
    );
  }
  return total;
}
