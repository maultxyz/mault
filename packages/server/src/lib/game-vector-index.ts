import { pool } from "../db";

const SAFE_KEY = /^[a-z0-9_]+$/;
const VALID_TABLES = new Set(["cards", "cards_v2"]);

export async function ensureGameVectorIndex(
  gameKey: string,
  table: "cards" | "cards_v2" = "cards",
  lang?: string,
): Promise<{ success: boolean; message?: string }> {
  if (!SAFE_KEY.test(gameKey)) {
    return {
      success: false,
      message: `Game key "${gameKey}" must be lowercase letters, digits, and underscores only to get a vector index.`,
    };
  }
  if (!VALID_TABLES.has(table)) {
    return { success: false, message: `Unknown table "${table}".` };
  }
  if (lang !== undefined && !SAFE_KEY.test(lang)) {
    return {
      success: false,
      message: `Lang "${lang}" must be lowercase letters, digits, and underscores only to get a vector index.`,
    };
  }

  // Scoping by lang too (when given) matches findCardMatches' actual WHERE
  // clause (game_key AND lang) exactly, instead of relying on iterative_scan
  // to filter lang out of a game_key-only partial index post-hoc.
  const indexName = lang
    ? `${table}_embedding_hnsw_${gameKey}_${lang}`
    : `${table}_embedding_hnsw_${gameKey}`;
  const whereClause = lang
    ? `"game_key" = '${gameKey}' AND "lang" = '${lang}'`
    : `"game_key" = '${gameKey}'`;

  // CREATE INDEX CONCURRENTLY on a large catalog (MTG/Pokemon are 50k-150k+
  // rows) can take minutes, so this needs a dedicated client rather than
  // whatever connection the shared pool hands out - both so a bumped
  // maintenance_work_mem (default 64MB is a big slowdown for HNSW graph
  // construction at this size) doesn't leak onto other pooled connections'
  // later queries, and so this can safely be called fire-and-forget by a
  // caller that isn't going to await it for minutes inside an HTTP request.
  const client = await pool.connect();
  try {
    await client.query(`SET maintenance_work_mem = '512MB'`);

    const { rows } = await client.query<{ indisvalid: boolean }>(
      `SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass('public."${indexName}"')`,
    );
    if (rows[0] && !rows[0].indisvalid) {
      await client.query(`DROP INDEX CONCURRENTLY "${indexName}"`);
    }

    await client.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${indexName}" ` +
        `ON "${table}" USING hnsw ("embedding" vector_cosine_ops) WHERE ${whereClause}`,
    );
    return { success: true };
  } catch (err) {
    console.error(
      `[game-vector-index] Failed to index "${gameKey}"${lang ? `/${lang}` : ""} on "${table}":`,
      err,
    );
    return { success: false, message: "Failed to build the vector index." };
  } finally {
    await client.query(`RESET maintenance_work_mem`).catch(() => {});
    client.release();
  }
}
