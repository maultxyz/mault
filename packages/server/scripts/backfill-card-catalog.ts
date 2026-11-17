import { and, asc, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/db";
import { cardImageVectors } from "../src/db/schema";
import { catalogColumnsFor } from "../src/lib/card-catalog";
import { CARD_CATALOG_BACKFILL_BATCH_SIZE } from "../src/lib/constants/saved-cards";
import { SYNC_REINDEX_MIN_CHANGED_FRACTION } from "../src/lib/constants/sync";
import { rebuildGameVectorIndex } from "../src/lib/game-vector-index";

async function main() {
  let lastId = 0;
  let checked = 0;
  let updated = 0;
  const totalsByScope = new Map<string, { checked: number; updated: number }>();
  const scopeOf = (gameKey: string, lang: string) => `${gameKey}|${lang}`;
  const tally = (scope: string) => {
    const entry = totalsByScope.get(scope) ?? { checked: 0, updated: 0 };
    totalsByScope.set(scope, entry);
    return entry;
  };

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
    for (const row of rows) tally(scopeOf(row.gameKey, row.lang)).checked++;

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
      RETURNING c.game_key, c.lang
    `);
    updated += result.rowCount ?? 0;
    for (const row of result.rows as { game_key: string; lang: string }[]) {
      tally(scopeOf(row.game_key, row.lang)).updated++;
    }
    console.log(`Checked ${checked} card(s), updated ${updated} (up to id ${lastId}).`);
  }

  console.log(`Done: ${updated} of ${checked} card(s) updated.`);
  for (const [scope, counts] of totalsByScope) {
    if (counts.updated < counts.checked * SYNC_REINDEX_MIN_CHANGED_FRACTION) continue;
    const [gameKey, lang] = scope.split("|");
    console.log(`${counts.updated} of ${counts.checked} ${scope} cards changed, rebuilding its vector index...`);
    const indexName = await rebuildGameVectorIndex(gameKey, lang);
    console.log(indexName ? `Rebuilt ${indexName}.` : `No vector index for ${scope}.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
