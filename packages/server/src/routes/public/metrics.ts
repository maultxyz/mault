import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { collectionCards, unmatchedCards } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";

// GET /public/metrics — unauthenticated, app-wide totals across every org.
// No per-org breakdown: collection_cards/unmatched_cards are RLS-scoped per
// org and this route has no JWT/org context to scope by, so it reads
// through the RLS-bypassing `db` export (same pattern as public/games.ts)
// and aggregates across everything.
export const publicMetricsRoute = new Hono<AppEnv>().get(
  "/metrics",
  async (c) => {
    try {
      const [{ unidentified }] = await db
        .select({ unidentified: sql<number>`count(*)::int` })
        .from(unmatchedCards);

      // `card` is jsonb (PlayingCardWithDistance) - `distance` isn't present
      // on every historical row (e.g. manually-added cards never scanned),
      // so the distance average only counts rows where it's actually a
      // number. Mirrors matchPercentFromDistance (web/lib/utils.ts) exactly:
      // the raw cosine similarity as a percentage, distance 0 is 100%,
      // distance 1 is 0%. `corrected` is a scan the user manually fixed
      // after a wrong auto-match; `multipleMatches` is a scan where the
      // matcher itself returned more than one close candidate
      // (alternativeMatches populated) - both signal auto-match confidence
      // issues distinct from a clean single-best-guess scan.
      const [{ matched, corrected, multipleMatches, avgPercent }] = await db
        .select({
          matched: sql<number>`count(*)::int`,
          corrected: sql<number>`count(*) filter (where is_corrected)::int`,
          multipleMatches: sql<number>`count(*) filter (where alternative_matches is not null)::int`,
          avgPercent: sql<number | null>`avg(
            greatest(0, least(100, (1 - (card->>'distance')::double precision) * 100))
          ) filter (where jsonb_typeof(card->'distance') = 'number')`,
        })
        .from(collectionCards);

      const totalScanned = matched + unidentified;
      const averageMatchPercent =
        avgPercent != null ? Math.round(avgPercent * 10) / 10 : null;

      return c.json({
        success: true,
        data: {
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
        },
      });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
