import { Hono } from "hono";
import { authQuery } from "../../db";
import { featureHighlightViews } from "../../db/schema";
import {
  firstIssueMessage,
  markFeatureHighlightsSeenSchema,
} from "../../lib/feature-highlight-input";
import { filterKnownFeatureHighlightIds } from "../../lib/feature-highlight-selection";
import { loadKnownFeatureHighlightIds } from "../../lib/feature-highlights";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const markFeatureHighlightsSeenRoute = new Hono<AppEnv>().post(
  "/seen",
  requireAuth,
  async (c) => {
    const parsed = markFeatureHighlightsSeenSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json(
        { success: false, message: firstIssueMessage(parsed.error) },
        400,
      );
    }
    const highlightIds = filterKnownFeatureHighlightIds(
      parsed.data.highlightIds,
      await loadKnownFeatureHighlightIds(),
    );
    if (highlightIds.length > 0 && !c.get("impersonatedBy")) {
      const userId = c.get("userId");
      await authQuery(c.get("jwtClaims"), (tx) =>
        tx
          .insert(featureHighlightViews)
          .values(highlightIds.map((highlightId) => ({ userId, highlightId })))
          .onConflictDoNothing(),
      );
    }
    return c.json({ success: true, data: { seenHighlightIds: highlightIds } });
  },
);
