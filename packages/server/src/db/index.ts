import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  ROLE_SWITCH_REFUSED_ERROR_CODES,
  ROW_LEVEL_SECURITY_OFF_VALUE,
} from "../lib/constants/database";
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

let hostedAuthenticatedRoleProbe: Promise<boolean> | null = null;

function errorCodeOf(error: unknown): string | null {
  for (let current = error; current instanceof Error; current = current.cause) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

function hostedDatabaseAllowsAuthenticatedRole(): Promise<boolean> {
  hostedAuthenticatedRoleProbe ??= db
    .transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('role', 'authenticated', true)`);
      return true;
    })
    .catch((error: unknown) => {
      const code = errorCodeOf(error);
      if (!code || !ROLE_SWITCH_REFUSED_ERROR_CODES.has(code)) {
        hostedAuthenticatedRoleProbe = null;
        throw error;
      }
      console.error(
        "[db] ROW-LEVEL SECURITY IS NOT ENFORCED: this database refuses SET ROLE authenticated. Grant the role to the app's database user, or set DB_ROW_LEVEL_SECURITY=off to silence this.",
        error,
      );
      return false;
    });
  return hostedAuthenticatedRoleProbe;
}

async function switchesToAuthenticatedRole(): Promise<boolean> {
  if (process.env.AUTH_PROVIDER === "local") return true;
  if (process.env.DB_ROW_LEVEL_SECURITY === ROW_LEVEL_SECURITY_OFF_VALUE) return false;
  return hostedDatabaseAllowsAuthenticatedRole();
}

export async function authQuery<T>(
  jwtClaims: string,
  callback: (tx: Transaction) => Promise<T>,
  transactionSettings: Readonly<Record<string, string>> = {},
): Promise<T> {
  const isLocalAuth = process.env.AUTH_PROVIDER === "local";
  const switchesRole = await switchesToAuthenticatedRole();
  const extraSettings = sql.join(
    Object.entries(transactionSettings).map(
      ([name, value]) => sql`, set_config(${name}, ${value}, true)`,
    ),
  );
  return db.transaction(async (tx) => {
    await tx.execute(
      !switchesRole
        ? sql`SELECT set_config('request.jwt.claims', ${jwtClaims}, true)${extraSettings}`
        : isLocalAuth
          ? sql`SELECT set_config('request.jwt.claims', ${jwtClaims}, true), set_config('role', 'authenticated', true)${extraSettings}`
          : sql`SELECT auth.user_id() IS NULL, set_config('request.jwt.claims', ${jwtClaims}, true), set_config('role', 'authenticated', true)${extraSettings}`,
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
