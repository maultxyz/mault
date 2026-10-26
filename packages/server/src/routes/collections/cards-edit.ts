import {
  isCardCondition,
  type CardCondition,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { logActivity } from "../../lib/activity-log";
import { collectionCards } from "../../db/schema";
import { markScanCorrected } from "../../lib/scan-stats";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toScannedCard } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";
import { findFoilPrinting } from "../../lib/card-search/foil-printing";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";

export const editCollectionCardRoute = new Hono<AppEnv>().put(
  "/:guid/cards/:scanId",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { guid, scanId } = c.req.param();
    const { card, binNumber, isFoil, foilType, condition, confirmed, reviewed } =
      await c.req.json<{
        confirmed?: boolean;
        reviewed?: boolean;
        card?: PlayingCardWithDistance;
        binNumber?: number;
        isFoil?: boolean;
        foilType?: string | null;
        condition?: CardCondition;
      }>();
    if (condition !== undefined && !isCardCondition(condition)) {
      return c.json({ success: false, message: "Invalid condition." }, 400);
    }
    const foilPrintingScope =
      card === undefined && foilType !== undefined
        ? await resolveGameKeyAndLang(c.get("jwtClaims"), guid)
        : null;
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const existing = await tx.query.collectionCards.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, scanId), eq(t.orgId, orgId)),
          columns: {
            id: true,
            scannedAt: true,
            card: true,
            binNumber: true,
            isFoil: true,
            foilType: true,
            condition: true,
            isCorrected: true,
            lowConfidenceMatch: true,
            isReviewed: true,
          },
        });
        if (!existing) return { success: false, message: "Card not found." };

        const foilPrinting =
          foilPrintingScope && foilType !== undefined
            ? await findFoilPrinting(
                foilPrintingScope.gameKey,
                existing.card as PlayingCardWithDistance,
                foilType,
              )
            : null;

        const updates: Partial<typeof collectionCards.$inferInsert> = {};
        if (foilPrinting) {
          updates.card = foilPrinting;
          updates.cardId = foilPrinting.id;
        }
        if (card !== undefined) {
          updates.card = card;
          updates.cardId = card.id;
          if (binNumber !== undefined) updates.binNumber = binNumber;
          updates.isCorrected = true;
        } else if (binNumber !== undefined) {
          updates.binNumber = binNumber;
        }
        if (confirmed) updates.isCorrected = true;
        const resolvesReview = card !== undefined || !!confirmed || !!reviewed;
        if (resolvesReview) {
          updates.isReviewed = true;
          updates.lowConfidenceMatch = false;
        }
        if (isFoil !== undefined) updates.isFoil = isFoil;
        if (foilType !== undefined) updates.foilType = foilType;
        if (condition !== undefined) updates.condition = condition;

        await tx
          .update(collectionCards)
          .set(updates)
          .where(eq(collectionCards.id, existing.id));
        if (card !== undefined) {
          await logActivity(tx, {
            orgId,
            userId: c.get("userId"),
            action: "card.corrected",
            summary: card.name,
            details: {
              scanId,
              collectionGuid: guid,
              from: (existing.card as PlayingCardWithDistance).name,
              to: card.name,
            },
          });
        }

        return {
          success: true,
          data: toScannedCard({
            guid: scanId,
            card: (card ??
              foilPrinting ??
              existing.card) as PlayingCardWithDistance,
            scannedAt: existing.scannedAt,
            binNumber: binNumber !== undefined ? binNumber : existing.binNumber,
            isFoil: isFoil !== undefined ? isFoil : existing.isFoil,
            foilType: foilType !== undefined ? foilType : existing.foilType,
            condition: condition ?? existing.condition,
            isCorrected:
              card !== undefined || confirmed ? true : existing.isCorrected,
            lowConfidenceMatch: resolvesReview ? false : existing.lowConfidenceMatch,
            isReviewed: resolvesReview ? true : existing.isReviewed,
          }),
        };
      });
      if (result.success) {
        if (card !== undefined) void markScanCorrected(scanId);
        emitToSession(guid, "card_updated", result.data);
      }
      return c.json(result);
    } catch (err) {
      emitToSession(guid, "scan_error", {
        message: "Failed to update card.",
        timestamp: Date.now(),
      });
      return databaseErrorResponse(c, err);
    }
  },
);
