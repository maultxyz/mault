import { SYNC_VECTORIZE_CONCURRENCY_MAX } from "@magic-vault/shared";
import { Hono } from "hono";
import { getStatus, startSync, SYNC_SOURCES } from "../../lib/sync-job";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

function parseConcurrency(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 1 || value > SYNC_VECTORIZE_CONCURRENCY_MAX) return undefined;
  return value;
}

export const syncStartRoute = new Hono<AppEnv>().post(
  "/sync",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    let gameKey: string | undefined;
    let lang = "en";
    let forceResync = false;
    let concurrency: number | undefined;
    try {
      const body = await c.req.json<{
        gameKey?: string;
        lang?: string;
        forceResync?: boolean;
        concurrency?: number;
      }>();
      gameKey = body.gameKey;
      if (body.lang) lang = body.lang;
      if (body.forceResync) forceResync = true;
      concurrency = parseConcurrency(body.concurrency);
    } catch {}

    if (!gameKey) {
      return c.json({ success: false, message: "gameKey is required." }, 400);
    }
    const source = SYNC_SOURCES[gameKey];
    if (!source) {
      return c.json(
        { success: false, message: `Unknown sync source: ${gameKey}` },
        400,
      );
    }
    if (!source.languages.includes(lang)) {
      return c.json(
        {
          success: false,
          message: `${source.label} does not support language: ${lang}`,
        },
        400,
      );
    }

    startSync(
      c.req.header("X-Org-Id"),
      gameKey,
      lang,
      forceResync,
      undefined,
      concurrency,
    );
    return c.json({ success: true, data: getStatus() });
  },
);
