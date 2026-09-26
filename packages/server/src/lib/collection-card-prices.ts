import type { PlayingCard } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { applyTcgplayerPrices } from "./card-search/tcgplayer-prices";
import { ADAPTERS_BY_GAME_KEY } from "./card-search/resolve";
import { COLLECTION_CARD_PRICE_REFRESH_BATCH_SIZE } from "./constants/sync";

const PRICE_KEYS = [
  "price",
  "priceFoil",
  "priceRange",
  "priceRangeFoil",
] as const;

function pricesOf(card: PlayingCard): Record<string, unknown> {
  return Object.fromEntries(
    PRICE_KEYS.flatMap((key) =>
      card[key] === undefined ? [] : [[key, card[key]]],
    ),
  );
}

// Stamps each scanned card's stored JSON with its current TCGplayer prices,
// so SQL-side reads (collection stats, price sorting, exports, the Discord
// bot) see the same prices as the read-time overlay.
export async function refreshCollectionCardPrices({
  log,
}: {
  log: (msg: string) => void;
}): Promise<number> {
  let totalUpdated = 0;
  for (const [gameKey, adapter] of Object.entries(ADAPTERS_BY_GAME_KEY)) {
    if (!adapter.tcgplayer) continue;
    const gameCollections = sql`(
      SELECT c.id FROM collections c JOIN games g ON g.id = c.game_id
      WHERE g.key = ${gameKey}
    )`;

    let updated = 0;
    let lastCardId = "";
    for (;;) {
      const batch = await db.execute(sql`
        SELECT DISTINCT ON (card_id) card_id, card
        FROM collection_cards
        WHERE collection_id IN ${gameCollections} AND card_id > ${lastCardId}
        ORDER BY card_id
        LIMIT ${COLLECTION_CARD_PRICE_REFRESH_BATCH_SIZE}
      `);
      const rows = batch.rows as unknown as {
        card_id: string;
        card: PlayingCard;
      }[];
      if (rows.length === 0) break;
      lastCardId = rows[rows.length - 1].card_id;

      const priced = await applyTcgplayerPrices(
        adapter,
        rows.map((row) => row.card),
      );
      const updates = rows.map((row, i) => ({
        card_id: row.card_id,
        prices: pricesOf(priced[i]),
      }));

      const result = await db.execute(sql`
        UPDATE collection_cards cc
        SET card = cc.card || v.prices
        FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb)
          AS v(card_id text, prices jsonb)
        WHERE cc.card_id = v.card_id
          AND cc.collection_id IN ${gameCollections}
          AND NOT cc.card @> v.prices
      `);
      updated += result.rowCount ?? 0;
    }

    totalUpdated += updated;
    log(`${gameKey}: refreshed prices on ${updated} scanned cards.`);
  }
  return totalUpdated;
}
