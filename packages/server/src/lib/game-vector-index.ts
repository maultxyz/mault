import { sql } from "drizzle-orm";
import { db } from "../db";

const SAFE_KEY = /^[a-z0-9_]+$/;

export async function ensureGameVectorIndex(
  gameKey: string,
): Promise<{ success: boolean; message?: string }> {
  if (!SAFE_KEY.test(gameKey)) {
    return {
      success: false,
      message: `Game key "${gameKey}" must be lowercase letters, digits, and underscores only to get a vector index.`,
    };
  }

  const indexName = `cards_embedding_hnsw_${gameKey}`;

  try {
    const { rows } = await db.execute<{ indisvalid: boolean }>(
      sql.raw(
        `SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass('public."${indexName}"')`,
      ),
    );
    if (rows[0] && !rows[0].indisvalid) {
      await db.execute(sql.raw(`DROP INDEX CONCURRENTLY "${indexName}"`));
    }

    await db.execute(
      sql.raw(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${indexName}" ` +
          `ON "cards" USING hnsw ("embedding" vector_cosine_ops) WHERE "game_key" = '${gameKey}'`,
      ),
    );
    return { success: true };
  } catch (err) {
    console.error(`[game-vector-index] Failed to index "${gameKey}":`, err);
    return { success: false, message: "Failed to build the vector index." };
  }
}
