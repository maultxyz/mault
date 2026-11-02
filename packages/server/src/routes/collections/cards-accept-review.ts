import {
  reviewAcceptRequestSchema,
  type CardsReviewedEvent,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery, type Transaction } from "../../db";
import { collectionCards } from "../../db/schema";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const acceptReviewCollectionCardsRoute = new Hono<AppEnv>().post(
  "/:guid/cards/accept-review",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const parsed = reviewAcceptRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ success: false, message: "Invalid card ids." }, 400);
    }
    const { confirmScanIds, reviewScanIds } = parsed.data;
    const acceptScanIds = async (
      tx: Transaction,
      scanIds: string[],
      confirmed: boolean,
    ) => {
      if (scanIds.length === 0) return [];
      const rows = await tx
        .update(collectionCards)
        .set({
          isReviewed: true,
          lowConfidenceMatch: false,
          ...(confirmed ? { isCorrected: true } : {}),
        })
        .where(
          and(
            inArray(collectionCards.guid, scanIds),
            eq(collectionCards.orgId, orgId),
          ),
        )
        .returning({ scanId: collectionCards.guid });
      return rows.map((row) => row.scanId);
    };
    const { confirmedScanIds, reviewedScanIds } = await authQuery(
      c.get("jwtClaims"),
      async (tx) => ({
        confirmedScanIds: await acceptScanIds(tx, confirmScanIds, true),
        reviewedScanIds: await acceptScanIds(tx, reviewScanIds, false),
      }),
    );
    if (confirmedScanIds.length + reviewedScanIds.length > 0) {
      const event: CardsReviewedEvent = { confirmedScanIds, reviewedScanIds };
      emitToSession(guid, "cards_reviewed", event);
      emitCollectionCardsChanged(orgId, guid);
    }
    return c.json({
      success: true,
      data: { acceptedScanIds: [...confirmedScanIds, ...reviewedScanIds] },
    });
  },
);
