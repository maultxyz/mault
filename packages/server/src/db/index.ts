import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createPool(
  maxConnections: number,
  connectionTimeoutMs = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? "10000"),
): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_SSL !== "false",
    max: maxConnections,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "10000"),
    connectionTimeoutMillis: connectionTimeoutMs,
    keepAlive: true,
  });
}

export const pool = createPool(parseInt(process.env.DB_POOL_MAX ?? "10"));
export const db = drizzle(pool, { schema });

export const singleStatementPool = createPool(
  parseInt(process.env.DB_SINGLE_STATEMENT_POOL_MAX ?? "4"),
);
export const singleStatementDb = drizzle(singleStatementPool, { schema });

export const backgroundLoadPool = createPool(
  parseInt(process.env.DB_BACKGROUND_LOAD_POOL_MAX ?? "4"),
  parseInt(process.env.DB_BACKGROUND_LOAD_CONNECTION_TIMEOUT_MS ?? "120000"),
);
export const backgroundLoadDb = drizzle(backgroundLoadPool, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function orgIdOfJwtClaims(jwtClaims: string): string | null {
  const claims = JSON.parse(jwtClaims) as { org_id?: unknown };
  return typeof claims.org_id === "string" ? claims.org_id : null;
}

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

export async function apiKeyQuery<T>(
  orgId: string,
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ org_id: orgId })}, true), set_config('role', 'api_service', true)`,
    );
    return callback(tx);
  });
}
