import { Hono } from "hono";
import { getStatus } from "../../lib/sync-job";
import { requireAuth, type AppEnv } from "../../middleware/auth";

// GET /admin/sync — status is visible to any authenticated user; only
// admins can start/cancel a sync (see sync-start.ts/sync-cancel.ts)
export const syncStatusRoute = new Hono<AppEnv>().get("/sync", requireAuth, (c) => {
  return c.json({ success: true, data: getStatus() });
});
