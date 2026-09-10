import { Hono } from "hono";
import { getStatus, startSync, SYNC_SOURCES } from "../../lib/sync-job";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const syncStartRoute = new Hono<AppEnv>().post(
  "/sync",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    let gameKey: string | undefined;
    let lang = "en";
    try {
      const body = await c.req.json<{ gameKey?: string; lang?: string }>();
      gameKey = body.gameKey;
      if (body.lang) lang = body.lang;
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

    startSync(c.req.header("X-Org-Id"), gameKey, lang);
    return c.json({ success: true, data: getStatus() });
  },
);
