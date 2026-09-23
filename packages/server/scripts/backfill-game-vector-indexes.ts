/**
 * One-off backfill: builds a partial HNSW index per (game_key, lang) pair
 * (see lib/game-vector-index.ts) for every pair that already has rows in
 * the target table, i.e. every game/lang synced before that per-pair
 * indexing existed (or, for `cards_v2`, every game/lang already synced into
 * the parallel embedding-transition table — see cardImageVectorsV2 in
 * db/schema.ts). Scoping by lang too matches findCardMatches' actual
 * WHERE clause (game_key AND lang) exactly, instead of a game_key-only
 * index relying on iterative_scan to filter lang out post-hoc.
 *
 * New games still get a game_key-only index at creation time
 * (routes/games/add.ts, edit.ts), since there's no data/lang yet at that
 * point — this only needs to run for a table's existing backlog.
 *
 * CREATE INDEX CONCURRENTLY builds without locking out reads/writes on the
 * table, but still does real work proportional to that pair's row count,
 * so this can take a while for a large catalog (e.g. MTG) — that's
 * expected, let it run to completion.
 *
 * Usage (from packages/server):
 *   tsx --env-file ../../.env scripts/backfill-game-vector-indexes.ts [cards|cards_v2]
 *
 * Defaults to `cards` when no argument is given.
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { ensureGameVectorIndex } from "../src/lib/game-vector-index";

const VALID_TABLES = ["cards", "cards_v2"] as const;
type Table = (typeof VALID_TABLES)[number];

async function main() {
  const arg = process.argv[2] ?? "cards";
  if (!VALID_TABLES.includes(arg as Table)) {
    console.error(`Unknown table "${arg}" — expected one of: ${VALID_TABLES.join(", ")}`);
    process.exit(1);
  }
  const table = arg as Table;

  const { rows } = await db.execute<{ game_key: string; lang: string }>(
    sql.raw(
      `SELECT DISTINCT game_key, lang FROM "${table}" ORDER BY game_key, lang`,
    ),
  );

  if (rows.length === 0) {
    console.log(`No cards in "${table}" yet — nothing to index.`);
    process.exit(0);
  }

  console.log(`Building partial indexes on "${table}" for ${rows.length} game/lang pair(s)...`);

  let failed = 0;
  for (const { game_key: gameKey, lang } of rows) {
    process.stdout.write(`  ${gameKey}/${lang}... `);
    const result = await ensureGameVectorIndex(gameKey, table, lang);
    if (result.success) {
      console.log("ok");
    } else {
      failed++;
      console.log(`FAILED — ${result.message}`);
    }
  }

  console.log(
    `\nDone: ${rows.length - failed}/${rows.length} succeeded.` +
      (failed > 0
        ? " Re-run this script to retry the failed pair(s) once fixed."
        : ""),
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
