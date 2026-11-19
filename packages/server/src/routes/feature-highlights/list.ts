import {
  FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM,
  type FeatureHighlightsResponse,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { featureHighlightViews } from "../../db/schema";
import { FEATURE_HIGHLIGHT_INCLUDE_SEEN_VALUES } from "../../lib/constants/feature-highlights";
import {
  featureHighlightsInWindow,
  selectFeatureHighlights,
} from "../../lib/feature-highlight-selection";
import {
  loadPublishedFeatureHighlights,
  resolveFeatureHighlightMedia,
} from "../../lib/feature-highlights";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const listFeatureHighlightsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  async (c) => {
    const now = new Date();
    const includesSeenHighlights = FEATURE_HIGHLIGHT_INCLUDE_SEEN_VALUES.includes(
      c.req.query(FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM) ?? "",
    );
    const highlights = featureHighlightsInWindow(
      await loadPublishedFeatureHighlights(),
      now,
    );
    const userId = c.get("userId");
    const seenRows =
      highlights.length === 0
        ? []
        : await authQuery(c.get("jwtClaims"), (tx) =>
            tx
              .select({ highlightId: featureHighlightViews.highlightId })
              .from(featureHighlightViews)
              .where(
                and(
                  eq(featureHighlightViews.userId, userId),
                  inArray(
                    featureHighlightViews.highlightId,
                    highlights.map((highlight) => highlight.id),
                  ),
                ),
              ),
          );
    const selected = selectFeatureHighlights({
      highlights,
      seenHighlightIds: new Set(seenRows.map((row) => row.highlightId)),
      includesSeenHighlights,
      now,
    });
    const data: FeatureHighlightsResponse = {
      highlights: await Promise.all(
        selected.highlights.map(resolveFeatureHighlightMedia),
      ),
      seenHighlightIds: selected.seenHighlightIds,
    };
    return c.json({ success: true, data });
  },
);
