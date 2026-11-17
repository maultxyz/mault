import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { findCatalogCardKeys } from "../src/lib/card-catalog";
import { SAVED_CARD_SLIM_BATCH_SIZE } from "../src/lib/constants/saved-cards";
import {
  savedCardCatalogKeys,
  slimSavedCardSnapshots,
} from "../src/lib/saved-cards";
import type { SavedCollectionCardRow } from "../src/lib/interfaces/saved-cards";

async function main() {
  let lastId = 0;
  let checked = 0;
  let slimmed = 0;

  while (true) {
    const result = await db.execute(sql`
      SELECT cc.id, cc.card, cc.alternative_matches, g.key AS game_key, col.lang
      FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id
      LEFT JOIN games g ON g.id = col.game_id
      WHERE cc.id > ${lastId}
      ORDER BY cc.id
      LIMIT ${SAVED_CARD_SLIM_BATCH_SIZE}
    `);
    const rows = result.rows as unknown as SavedCollectionCardRow[];
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;
    checked += rows.length;

    const scopeOf = (row: SavedCollectionCardRow) => ({ gameKey: row.game_key, lang: row.lang });
    const inCatalog = await findCatalogCardKeys(
      rows.flatMap((row) =>
        savedCardCatalogKeys(scopeOf(row), row.card, row.alternative_matches),
      ),
    );
    const values = rows.flatMap((row) => {
      const saved = slimSavedCardSnapshots(
        scopeOf(row),
        row.card,
        row.alternative_matches,
        inCatalog,
      );
      const changed =
        JSON.stringify(saved.card) !== JSON.stringify(row.card) ||
        JSON.stringify(saved.alternativeMatches) !==
          JSON.stringify(row.alternative_matches?.length ? row.alternative_matches : null);
      return changed
        ? [{ id: row.id, card: saved.card, alternative_matches: saved.alternativeMatches }]
        : [];
    });
    if (values.length > 0) {
      const update = await db.execute(sql`
        UPDATE collection_cards AS cc
        SET card = x.card, alternative_matches = x.alternative_matches
        FROM jsonb_to_recordset(${JSON.stringify(values)}::jsonb)
          AS x(id integer, card jsonb, alternative_matches jsonb)
        WHERE cc.id = x.id
      `);
      slimmed += update.rowCount ?? 0;
    }
    console.log(`Checked ${checked} saved card(s), slimmed ${slimmed} (up to id ${lastId}).`);
  }

  console.log(`Done: ${slimmed} of ${checked} saved card(s) slimmed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
