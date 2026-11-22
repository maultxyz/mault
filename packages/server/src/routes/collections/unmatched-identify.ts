import type {
  IdentifyUnmatchedCardRequest,
  ScannedCard,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { databaseErrorResponse } from "../../lib/database-error-response";
import { emitToSession } from "../../lib/session-stream";
import {
  announcePromotedUnmatchedScan,
  promoteUnmatchedScan,
} from "../../lib/unmatched-promotion";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const identifyUnmatchedCardRoute = new Hono<AppEnv>().post(
  "/:guid/unmatched/:scanId/identify",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { guid, scanId } = c.req.param();
    const { card, isFoil, foilType } =
      await c.req.json<IdentifyUnmatchedCardRequest>();
    if (!card?.id) {
      return c.json({ success: false, message: "A card is required." }, 400);
    }

    try {
      const outcome = await authQuery(c.get("jwtClaims"), (tx) =>
        promoteUnmatchedScan(tx, {
          orgId,
          collectionGuid: guid,
          scanId,
          card: { ...card, distance: 0, confidence: 1 },
          isFoil,
          foilType,
          origin: "identifiedByHand",
        }),
      );

      if (outcome.status !== 200) {
        return c.json(
          {
            success: false,
            message: outcome.message,
            ...("scanLimitReached" in outcome
              ? { scanLimitReached: true }
              : {}),
          },
          outcome.status,
        );
      }

      await announcePromotedUnmatchedScan(outcome.promoted);
      const data: ScannedCard = outcome.promoted.card;
      return c.json({ success: true, data });
    } catch (err) {
      emitToSession(orgId, guid, "scan_error", {
        message: "Failed to add the identified card.",
        timestamp: Date.now(),
      });
      return databaseErrorResponse(c, err);
    }
  },
);
