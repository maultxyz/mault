import {
  FEATURE_HIGHLIGHTS_TIMELINE_BEFORE_PARAM,
  FEATURE_HIGHLIGHTS_TIMELINE_PAGE_SIZE,
  type FeatureHighlightTimelinePage,
} from "@magic-vault/shared";
import { Hono } from "hono";
import {
  parseFeatureHighlightTimelineCursor,
  selectFeatureHighlightTimelinePage,
} from "../../lib/feature-highlight-selection";
import {
  loadPublishedFeatureHighlights,
  loadSeenFeatureHighlightIds,
  resolveFeatureHighlightMedia,
} from "../../lib/feature-highlights";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const featureHighlightTimelineRoute = new Hono<AppEnv>().get(
  "/timeline",
  requireAuth,
  async (c) => {
    const beforeText = c.req.query(FEATURE_HIGHLIGHTS_TIMELINE_BEFORE_PARAM);
    const before = beforeText
      ? parseFeatureHighlightTimelineCursor(beforeText)
      : null;
    if (beforeText && !before) {
      return c.json({ success: false, message: "Invalid timeline cursor." }, 400);
    }
    const page = selectFeatureHighlightTimelinePage({
      highlights: await loadPublishedFeatureHighlights(),
      seenHighlightIds: new Set(),
      before,
      pageSize: FEATURE_HIGHLIGHTS_TIMELINE_PAGE_SIZE,
      now: new Date(),
    });
    const seenHighlightIds = await loadSeenFeatureHighlightIds(
      c.get("jwtClaims"),
      c.get("userId"),
      page.highlights.map((highlight) => highlight.id),
    );
    const data: FeatureHighlightTimelinePage = {
      highlights: await Promise.all(
        page.highlights.map(resolveFeatureHighlightMedia),
      ),
      seenHighlightIds: page.highlights
        .map((highlight) => highlight.id)
        .filter((highlightId) => seenHighlightIds.has(highlightId)),
      nextBefore: page.nextBefore,
    };
    return c.json({ success: true, data });
  },
);
