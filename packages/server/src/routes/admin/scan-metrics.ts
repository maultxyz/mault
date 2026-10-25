import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { Hono } from "hono";
import { ADMIN_SCAN_METRICS_MAX_AGE_MS } from "../../lib/constants/timing";
import { scanMetricsCache } from "../../lib/public-metrics-cache";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const scanMetricsRoute = new Hono<AppEnv>().get(
  "/scan-metrics",
  requireAuth,
  requireRole(...PLATFORM_STAFF_ROLES),
  async (c) => {
    return c.json({
      success: true,
      data: await scanMetricsCache.get(ADMIN_SCAN_METRICS_MAX_AGE_MS),
    });
  },
);
