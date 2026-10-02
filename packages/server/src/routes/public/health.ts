import type { HealthCheck, HealthCheckResponse } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { HEALTH_CACHE_TTL_MS } from "../../lib/constants/timing";
import type { AppEnv } from "../../middleware/auth";

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { name: "Database", status: "ok", latencyMs: Date.now() - start };
  } catch {
    return {
      name: "Database",
      status: "error",
      latencyMs: Date.now() - start,
      message: "Connection failed.",
    };
  }
}

let cachedHealth: { data: HealthCheckResponse; expiresAt: number } | null =
  null;

export const healthRoute = new Hono<AppEnv>().get("/health", async (c) => {
  if (cachedHealth && cachedHealth.expiresAt > Date.now()) {
    return c.json({ success: true, data: cachedHealth.data });
  }

  const checks = [await checkDatabase()];
  const data: HealthCheckResponse = {
    healthy: checks.every((check) => check.status === "ok"),
    checkedAt: new Date().toISOString(),
    checks,
  };
  cachedHealth = { data, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS };
  return c.json({ success: true, data });
});
