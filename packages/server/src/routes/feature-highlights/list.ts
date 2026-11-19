import {
  FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM,
  type FeatureHighlightsResponse,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { FEATURE_HIGHLIGHT_INCLUDE_SEEN_VALUES } from "../../lib/constants/feature-highlights";
import {
  featureHighlightsInWindow,
  selectFeatureHighlights,
} from "../../lib/feature-highlight-selection";
import {
  loadPublishedFeatureHighlights,
  loadSeenFeatureHighlightIds,
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
    const seenHighlightIds = await loadSeenFeatureHighlightIds(
      c.get("jwtClaims"),
      c.get("userId"),
      highlights.map((highlight) => highlight.id),
    );
    const selected = selectFeatureHighlights({
      highlights,
      seenHighlightIds,
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
