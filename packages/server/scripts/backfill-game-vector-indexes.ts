/**
 * One-off backfill: builds the per-game_key partial HNSW index (see
 * lib/game-vector-index.ts) for every game_key that already has rows in
 * `cards`, i.e. every game synced before that per-game indexing existed.
 * New games get their index at creation time (routes/games.ts) — this only
 * needs to run once, after deploying the migration that drops the old
 * table-wide `cards_embedding_hnsw` index.
 *
 * CREATE INDEX CONCURRENTLY builds without locking out reads/writes on
 * `cards`, but still does real work proportional to that game_key's row
 * count, so this can take a while for a large catalog (e.g. MTG) — that's
 * expected, let it run to completion.
 *
 * Usage (from packages/server):
 *   tsx --env-file ../../.env scripts/backfill-game-vector-indexes.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { ensureGameVectorIndex } from "../src/lib/game-vector-index";

async function main() {
  const { rows } = await db.execute<{ game_key: string }>(
    sql`SELECT DISTINCT game_key FROM cards ORDER BY game_key`,
  );

  if (rows.length === 0) {
    console.log("No cards in the database yet — nothing to index.");
    process.exit(0);
  }

  console.log(`Building partial indexes for ${rows.length} game_key(s)...`);

  let failed = 0;
  for (const { game_key: gameKey } of rows) {
    process.stdout.write(`  ${gameKey}... `);
    const result = await ensureGameVectorIndex(gameKey);
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
        ? " Re-run this script to retry the failed key(s) once fixed."
        : ""),
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
