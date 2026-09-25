import type { PublicMetrics } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { collectionCards, unmatchedCards } from "../../db/schema";
import { getCachedPublicMetrics } from "../../lib/public-metrics-cache";
import type { AppEnv } from "../../middleware/auth";

async function computeMetrics(): Promise<PublicMetrics> {
  const [{ unidentified }] = await db
    .select({ unidentified: sql<number>`count(*)::int` })
    .from(unmatchedCards);

  const [{ matched, corrected, multipleMatches, avgPercent }] = await db
    .select({
      matched: sql<number>`count(*)::int`,
      corrected: sql<number>`count(*) filter (where is_corrected)::int`,
      multipleMatches: sql<number>`count(*) filter (where alternative_matches is not null)::int`,
      avgPercent: sql<number | null>`avg(
        greatest(0, least(100, coalesce(
          (card->>'confidence')::double precision,
          1 - (card->>'distance')::double precision
        ) * 100))
      ) filter (where jsonb_typeof(card->'distance') = 'number')`,
    })
    .from(collectionCards);

  const totalScanned = matched + unidentified;
  const averageMatchPercent =
    avgPercent != null ? Math.round(avgPercent * 10) / 10 : null;

  return {
    totalScanned,
    matched,
    unidentified,
    corrected,
    multipleMatches,
    matchRate:
      totalScanned > 0
        ? Math.round((matched / totalScanned) * 1000) / 10
        : null,
    averageMatchPercent,
  };
}

// GET /public/metrics — unauthenticated, app-wide totals across every org.
export const publicMetricsRoute = new Hono<AppEnv>().get(
  "/metrics",
  async (c) => {
    try {
      const data = await getCachedPublicMetrics(computeMetrics);
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
