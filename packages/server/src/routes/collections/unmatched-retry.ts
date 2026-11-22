import {
  UNMATCHED_RETRY_REQUEST_MAX_SCANS,
  type RetryUnmatchedCardsRequest,
} from "@magic-vault/shared";
import { Hono } from "hono";
import {
  isRetryingUnmatchedCards,
  parseUnmatchedRetryScanIds,
  retryUnmatchedCardsBatch,
} from "../../lib/unmatched-retry";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const retryUnmatchedCardsRoute = new Hono<AppEnv>().post(
  "/:guid/unmatched/retry",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { guid } = c.req.param();
    const body = await c.req
      .json<Partial<RetryUnmatchedCardsRequest>>()
      .catch((): Partial<RetryUnmatchedCardsRequest> => ({}));
    const scanIds = parseUnmatchedRetryScanIds(body.scanIds);
    if (scanIds == null) {
      return c.json(
        {
          success: false,
          message: `Choose between 1 and ${UNMATCHED_RETRY_REQUEST_MAX_SCANS} unmatched scans to retry.`,
        },
        400,
      );
    }
    if (isRetryingUnmatchedCards(orgId, guid)) {
      return c.json(
        { success: false, message: "These unmatched cards are already being retried." },
        409,
      );
    }
    const data = await retryUnmatchedCardsBatch({
      jwtClaims: c.get("jwtClaims"),
      orgId,
      collectionGuid: guid,
      scanIds,
    });
    return c.json({ success: true, data });
  },
);
