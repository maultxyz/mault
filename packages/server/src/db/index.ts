import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_SSL !== "false",
  max: parseInt(process.env.DB_POOL_MAX ?? "10"),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "10000"),
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT_MS ?? "10000",
  ),
});
export const db = drizzle(pool, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function authQuery<T>(
  jwtClaims: string,
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      process.env.AUTH_PROVIDER === "local"
        ? sql`SELECT set_config('request.jwt.claims', ${jwtClaims}, true), set_config('role', 'authenticated', true)`
        : sql`SELECT set_config('request.jwt.claims', ${jwtClaims}, true)`,
    );
    return callback(tx);
  });
}
