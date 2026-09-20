import { Hono } from "hono";
import { getScanVectorizeStats } from "../../lib/scan-vectorize-stats";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const scanVectorizeStatsRoute = new Hono<AppEnv>().get(
  "/scan-vectorize-stats",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    return c.json({ success: true, data: await getScanVectorizeStats() });
  },
);
