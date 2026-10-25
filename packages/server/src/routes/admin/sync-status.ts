import { Hono } from "hono";
import { getStatus } from "../../lib/sync-job";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const syncStatusRoute = new Hono<AppEnv>().get("/sync", requireAuth, (c) => {
  return c.json({ success: true, data: getStatus() });
});
