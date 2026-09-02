import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_SSL !== "false",
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function authQuery<T>(
  jwtClaims: string,
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${jwtClaims}, true)`,
    );
    // Neon's connection-level JWT-to-role mechanism (pg_session_jwt) maps the
    // claim above to the `authenticated` role automatically. A plain Postgres
    // instance has no such extension, so local mode must switch role itself.
    if (process.env.AUTH_PROVIDER === "local") {
      await tx.execute(sql`SET LOCAL ROLE authenticated`);
    }
    return callback(tx);
  });
}
