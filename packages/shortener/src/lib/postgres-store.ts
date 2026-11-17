import type { ShortenerCustomLink, ShortenerLink } from "@magic-vault/shared";
import { Pool } from "pg";
import { EXPIRED_LINK_RETENTION_INTERVAL } from "./constants/shortener";
import type { CustomLinkRow, ShortLinkStore } from "./interfaces/shortener";

export function createPostgresPool(environment: NodeJS.ProcessEnv): Pool {
  const connectionString = environment.SHORTENER_DATABASE_URL || environment.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  return new Pool({
    connectionString,
    ssl: environment.DATABASE_SSL !== "false",
    max: parseInt(environment.SHORTENER_DB_POOL_MAX ?? "5"),
    idleTimeoutMillis: parseInt(environment.DB_IDLE_TIMEOUT_MS ?? "10000"),
    connectionTimeoutMillis: parseInt(environment.DB_CONNECTION_TIMEOUT_MS ?? "10000"),
  });
}

export async function ensureShortLinkSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS shortener;
    CREATE TABLE IF NOT EXISTS shortener.short_links (
      code text PRIMARY KEY,
      target_path text NOT NULL,
      expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE shortener.short_links
      ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS short_links_expires_at_idx
      ON shortener.short_links (expires_at) WHERE expires_at IS NOT NULL;
  `);
}

function toCustomLink(row: CustomLinkRow): ShortenerCustomLink {
  return {
    code: row.code,
    targetUrl: row.target_path,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const CUSTOM_LINK_COLUMNS = "code, target_path, created_at, updated_at";

export function createPostgresShortLinkStore(pool: Pool): ShortLinkStore {
  return {
    async findTargetPath(code) {
      const result = await pool.query<{ target_path: string }>(
        `SELECT target_path FROM shortener.short_links
          WHERE (code = $1 OR (is_custom AND code = lower($1)))
            AND (expires_at IS NULL OR expires_at > now())
          ORDER BY code = $1 DESC
          LIMIT 1`,
        [code],
      );
      return result.rows[0]?.target_path ?? null;
    },
    async saveLinks(links: ShortenerLink[]) {
      if (links.length === 0) return;
      await pool.query(
        `INSERT INTO shortener.short_links (code, target_path, expires_at)
         SELECT * FROM unnest($1::text[], $2::text[], $3::timestamptz[])
         ON CONFLICT (code) DO UPDATE
           SET target_path = excluded.target_path,
               expires_at = excluded.expires_at,
               updated_at = now()
           WHERE NOT shortener.short_links.is_custom`,
        [
          links.map((link) => link.code),
          links.map((link) => link.targetPath),
          links.map((link) => link.expiresAt),
        ],
      );
      await pool.query(
        `DELETE FROM shortener.short_links
          WHERE expires_at < now() - interval '${EXPIRED_LINK_RETENTION_INTERVAL}'`,
      );
    },
    async deleteLinks(codes) {
      if (codes.length === 0) return;
      await pool.query(
        `DELETE FROM shortener.short_links WHERE code = ANY($1::text[]) AND NOT is_custom`,
        [codes],
      );
    },
    async listCustomLinks() {
      const result = await pool.query<CustomLinkRow>(
        `SELECT ${CUSTOM_LINK_COLUMNS} FROM shortener.short_links
          WHERE is_custom ORDER BY code`,
      );
      return result.rows.map(toCustomLink);
    },
    async createCustomLink(code, targetUrl) {
      const result = await pool.query<CustomLinkRow>(
        `INSERT INTO shortener.short_links (code, target_path, is_custom)
         VALUES ($1, $2, true)
         ON CONFLICT (code) DO NOTHING
         RETURNING ${CUSTOM_LINK_COLUMNS}`,
        [code, targetUrl],
      );
      return result.rows[0] ? toCustomLink(result.rows[0]) : null;
    },
    async updateCustomLink(code, targetUrl) {
      const result = await pool.query<CustomLinkRow>(
        `UPDATE shortener.short_links SET target_path = $2, updated_at = now()
          WHERE code = $1 AND is_custom
          RETURNING ${CUSTOM_LINK_COLUMNS}`,
        [code, targetUrl],
      );
      return result.rows[0] ? toCustomLink(result.rows[0]) : null;
    },
    async deleteCustomLink(code) {
      const result = await pool.query(
        `DELETE FROM shortener.short_links WHERE code = $1 AND is_custom`,
        [code],
      );
      return (result.rowCount ?? 0) > 0;
    },
  };
}
