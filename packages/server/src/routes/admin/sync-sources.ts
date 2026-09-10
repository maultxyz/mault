import { Hono } from "hono";
import { SYNC_SOURCES } from "../../lib/sync-job";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const syncSourcesRoute = new Hono<AppEnv>().get(
  "/sync/sources",
  requireAuth,
  requireRole("admin"),
  (c) => {
    const sources = Object.values(SYNC_SOURCES).map((s) => ({
      gameKey: s.gameKey,
      label: s.label,
      languages: s.languages,
    }));
    return c.json({ success: true, data: sources });
  },
);
