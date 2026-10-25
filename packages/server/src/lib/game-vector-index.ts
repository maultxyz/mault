import type { PoolClient } from "pg";
import { pool } from "../db";
import {
  CARD_VECTOR_INDEX_EF_CONSTRUCTION,
  CARD_VECTOR_INDEX_M,
} from "./constants/card-search";

const SAFE_KEY = /^[a-z0-9_]+$/;

function vectorIndexName(gameKey: string, lang?: string): string {
  return lang
    ? `cards_embedding_hnsw_${gameKey}_${lang}`
    : `cards_embedding_hnsw_${gameKey}`;
}

function vectorIndexWhere(gameKey: string, lang?: string): string {
  return lang
    ? `"game_key" = '${gameKey}' AND "lang" = '${lang}'`
    : `"game_key" = '${gameKey}'`;
}

async function createVectorIndex(
  client: PoolClient,
  indexName: string,
  whereClause: string,
): Promise<void> {
  const { rows } = await client.query<{ indisvalid: boolean }>(
    `SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass('public."${indexName}"')`,
  );
  if (rows[0] && !rows[0].indisvalid) {
    await client.query(`DROP INDEX CONCURRENTLY "${indexName}"`);
  }

  await client.query(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${indexName}" ` +
      `ON "cards" USING hnsw ("embedding" vector_cosine_ops) ` +
      `WITH (m = ${CARD_VECTOR_INDEX_M}, ef_construction = ${CARD_VECTOR_INDEX_EF_CONSTRUCTION}) ` +
      `WHERE ${whereClause}`,
  );
}

export async function ensureGameVectorIndex(
  gameKey: string,
  lang?: string,
): Promise<{ success: boolean; message?: string }> {
  if (!SAFE_KEY.test(gameKey)) {
    return {
      success: false,
      message: `Game key "${gameKey}" must be lowercase letters, digits, and underscores only to get a vector index.`,
    };
  }
  if (lang !== undefined && !SAFE_KEY.test(lang)) {
    return {
      success: false,
      message: `Lang "${lang}" must be lowercase letters, digits, and underscores only to get a vector index.`,
    };
  }

  const client = await pool.connect();
  try {
    await client.query(`SET maintenance_work_mem = '512MB'`);
    await createVectorIndex(
      client,
      vectorIndexName(gameKey, lang),
      vectorIndexWhere(gameKey, lang),
    );
    return { success: true };
  } catch (err) {
    console.error(
      `[game-vector-index] Failed to index "${gameKey}"${lang ? `/${lang}` : ""}:`,
      err,
    );
    return { success: false, message: "Failed to build the vector index." };
  } finally {
    await client.query(`RESET maintenance_work_mem`).catch(() => {});
    client.release();
  }
}

export async function rebuildGameVectorIndex(
  gameKey: string,
  lang: string,
): Promise<string | null> {
  if (!SAFE_KEY.test(gameKey) || !SAFE_KEY.test(lang)) return null;

  const client = await pool.connect();
  try {
    await client.query(`SET maintenance_work_mem = '512MB'`);
    const scopes = [lang, undefined];
    const { rows } = await client.query<{ name: string }>(
      `SELECT c.relname AS name FROM unnest($1::text[]) WITH ORDINALITY AS n(name, ord)
       JOIN pg_class c ON c.relname = n.name AND c.relkind = 'i'
       ORDER BY n.ord LIMIT 1`,
      [scopes.map((scope) => vectorIndexName(gameKey, scope))],
    );
    const indexName = rows[0]?.name;
    if (!indexName) return null;
    const scope = indexName === vectorIndexName(gameKey, lang) ? lang : undefined;

    const freshName = `${indexName}_fresh`;
    const staleName = `${indexName}_stale`;
    await client.query(`DROP INDEX CONCURRENTLY IF EXISTS "${freshName}"`);
    await client.query(`DROP INDEX CONCURRENTLY IF EXISTS "${staleName}"`);
    await createVectorIndex(client, freshName, vectorIndexWhere(gameKey, scope));

    await client.query("BEGIN");
    try {
      await client.query(`ALTER INDEX "${indexName}" RENAME TO "${staleName}"`);
      await client.query(`ALTER INDEX "${freshName}" RENAME TO "${indexName}"`);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    await client.query(`DROP INDEX CONCURRENTLY "${staleName}"`);
    return indexName;
  } finally {
    await client.query(`RESET maintenance_work_mem`).catch(() => {});
    client.release();
  }
}
