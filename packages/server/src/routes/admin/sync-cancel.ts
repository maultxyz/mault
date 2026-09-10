import { Hono } from "hono";
import { cancelSync, getStatus } from "../../lib/sync-job";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const syncCancelRoute = new Hono<AppEnv>().delete(
  "/sync",
  requireAuth,
  requireRole("admin"),
  (c) => {
    cancelSync();
    return c.json({ success: true, data: getStatus() });
  },
);
