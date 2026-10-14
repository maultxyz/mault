import { Hono } from "hono";
import { PUBLIC_METRICS_MAX_AGE_MS } from "../../lib/constants/timing";
import { scanMetricsCache } from "../../lib/public-metrics-cache";
import type { AppEnv } from "../../middleware/auth";

// GET /public/metrics — unauthenticated, app-wide totals across every org.
export const publicMetricsRoute = new Hono<AppEnv>().get(
  "/metrics",
  async (c) => {
    try {
      const data = await scanMetricsCache.get(PUBLIC_METRICS_MAX_AGE_MS);
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
