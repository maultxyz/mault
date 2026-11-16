import { and, asc, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/db";
import { cardImageVectors } from "../src/db/schema";
import { catalogColumnsFor } from "../src/lib/card-catalog";
import { CARD_CATALOG_BACKFILL_BATCH_SIZE } from "../src/lib/constants/saved-cards";

async function main() {
  let lastId = 0;
  let checked = 0;
  let updated = 0;

  while (true) {
    const rows = await db
      .select({
        id: cardImageVectors.id,
        cardId: cardImageVectors.cardId,
        gameKey: cardImageVectors.gameKey,
        lang: cardImageVectors.lang,
        data: cardImageVectors.data,
      })
      .from(cardImageVectors)
      .where(and(gt(cardImageVectors.id, lastId), isNotNull(cardImageVectors.data)))
      .orderBy(asc(cardImageVectors.id))
      .limit(CARD_CATALOG_BACKFILL_BATCH_SIZE);
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;
    checked += rows.length;

    const values = rows.map((row) => {
      const catalog = catalogColumnsFor(row.gameKey, row.lang, row.cardId, row.data);
      return {
        id: row.id,
        set_name: catalog.setName,
        rarity: catalog.rarity,
        color_identity: catalog.colorIdentity,
        search_text: catalog.searchText,
        image_small: catalog.imageSmall,
      };
    });
    const result = await db.execute(sql`
      UPDATE cards AS c
      SET set_name = x.set_name, rarity = x.rarity, color_identity = x.color_identity,
        search_text = x.search_text, image_small = x.image_small
      FROM jsonb_to_recordset(${JSON.stringify(values)}::jsonb)
        AS x(id integer, set_name text, rarity text, color_identity jsonb,
          search_text text, image_small text)
      WHERE c.id = x.id
        AND (c.set_name, c.rarity, c.color_identity, c.search_text, c.image_small)
          IS DISTINCT FROM (x.set_name, x.rarity, x.color_identity, x.search_text, x.image_small)
    `);
    updated += result.rowCount ?? 0;
    console.log(`Checked ${checked} card(s), updated ${updated} (up to id ${lastId}).`);
  }

  console.log(`Done: ${updated} of ${checked} card(s) updated.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
