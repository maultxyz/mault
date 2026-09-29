import { Hono } from "hono";
import { getCachedPublicMetrics } from "../../lib/public-metrics-cache";
import { computeScanMetrics } from "../../lib/scan-stats";
import type { AppEnv } from "../../middleware/auth";

// GET /public/metrics — unauthenticated, app-wide totals across every org.
export const publicMetricsRoute = new Hono<AppEnv>().get(
  "/metrics",
  async (c) => {
    try {
      const data = await getCachedPublicMetrics(computeScanMetrics);
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
