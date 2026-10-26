import { Hono } from "hono";
import { PUBLIC_METRICS_MAX_AGE_MS } from "../../lib/constants/timing";
import { scanMetricsCache } from "../../lib/public-metrics-cache";
import type { AppEnv } from "../../middleware/auth";

export const publicMetricsRoute = new Hono<AppEnv>().get(
  "/metrics",
  async (c) => {
    const data = await scanMetricsCache.get(PUBLIC_METRICS_MAX_AGE_MS);
    return c.json({ success: true, data });
  },
);
