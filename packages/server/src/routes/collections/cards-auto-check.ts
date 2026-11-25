import {
  reviewAutoCheckRequestSchema,
  type ReviewAutoCheckResult,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { REVIEW_AUTO_CHECK_LOCKED_RESULT } from "../../lib/constants/plan-access";
import { REVIEW_AUTO_CHECK_IN_PROGRESS_MESSAGE } from "../../lib/constants/review-auto-check";
import { orgHasFeature } from "../../lib/plan-config";
import {
  autoCheckReviewCards,
  isAutoCheckingReviewCards,
} from "../../lib/review-auto-check";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const autoCheckReviewCardsRoute = new Hono<AppEnv>().post(
  "/:guid/cards/auto-check",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const parsed = reviewAutoCheckRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ success: false, message: "Invalid card ids." }, 400);
    }
    const hasReviewAutoCheck = await authQuery(c.get("jwtClaims"), (tx) =>
      orgHasFeature(tx, orgId, "reviewAutoCheck"),
    );
    if (!hasReviewAutoCheck) return c.json(REVIEW_AUTO_CHECK_LOCKED_RESULT);
    if (isAutoCheckingReviewCards(orgId, guid)) {
      return c.json(
        { success: false, message: REVIEW_AUTO_CHECK_IN_PROGRESS_MESSAGE },
        409,
      );
    }
    const outcomes = await autoCheckReviewCards({
      jwtClaims: c.get("jwtClaims"),
      orgId,
      collectionGuid: guid,
      scanIds: parsed.data.scanIds,
    });
    const data: ReviewAutoCheckResult = { outcomes };
    return c.json({ success: true, data });
  },
);
