import type { PublicMetrics } from "@magic-vault/shared";
import { Hono } from "hono";
import {
  PUBLIC_METRICS_CACHE_CONTROL,
  PUBLIC_METRICS_MAX_AGE_MS,
} from "../../lib/constants/timing";
import { cardValueMetricsCache } from "../../lib/public-card-value";
import { scanMetricsCache } from "../../lib/public-metrics-cache";
import type { AppEnv } from "../../middleware/auth";

export const publicMetricsRoute = new Hono<AppEnv>().get(
  "/metrics",
  async (c) => {
    const scanMetrics = await scanMetricsCache.get(PUBLIC_METRICS_MAX_AGE_MS);
    const cardValueMetrics = await cardValueMetricsCache.get(
      PUBLIC_METRICS_MAX_AGE_MS,
      { servesStaleWhileRefreshing: true },
    );
    const data: PublicMetrics = { ...scanMetrics, ...cardValueMetrics };
    c.header("Cache-Control", PUBLIC_METRICS_CACHE_CONTROL);
    return c.json({ success: true, data });
  },
);
