/**
 * One-off backfill: builds a partial HNSW index per (game_key, lang) pair
 * (see lib/game-vector-index.ts) for every pair that already has rows in
 * `cards`, i.e. every game/lang synced before that per-pair indexing
 * existed. Scoping by lang too matches findCardMatches' actual WHERE clause
 * (game_key AND lang) exactly, instead of a game_key-only index relying on
 * iterative_scan to filter lang out post-hoc.
 *
 * New games still get a game_key-only index at creation time
 * (routes/games/add.ts, edit.ts), since there's no data/lang yet at that
 * point — this only needs to run for the existing backlog.
 *
 * CREATE INDEX CONCURRENTLY builds without locking out reads/writes on
 * `cards`, but still does real work proportional to that pair's row count,
 * so this can take a while for a large catalog (e.g. MTG) — that's
 * expected, let it run to completion.
 *
 * Usage (from packages/server):
 *   tsx --env-file ../../.env scripts/backfill-game-vector-indexes.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { ensureGameVectorIndex } from "../src/lib/game-vector-index";

async function main() {
  const { rows } = await db.execute<{ game_key: string; lang: string }>(
    sql`SELECT DISTINCT game_key, lang FROM cards ORDER BY game_key, lang`,
  );

  if (rows.length === 0) {
    console.log("No cards in the database yet — nothing to index.");
    process.exit(0);
  }

  console.log(`Building partial indexes for ${rows.length} game/lang pair(s)...`);

  let failed = 0;
  for (const { game_key: gameKey, lang } of rows) {
    process.stdout.write(`  ${gameKey}/${lang}... `);
    const result = await ensureGameVectorIndex(gameKey, lang);
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
