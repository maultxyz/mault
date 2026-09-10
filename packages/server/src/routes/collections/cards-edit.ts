import type { PlayingCardWithDistance } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toScannedCard } from "./shared";

// PUT /collections/:guid/cards/:scanId — update card (correction and/or foil status)
export const editCollectionCardRoute = new Hono<AppEnv>().put(
  "/:guid/cards/:scanId",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { guid, scanId } = c.req.param();
    const { card, binNumber, isFoil, foilType } = await c.req.json<{
      card?: PlayingCardWithDistance;
      binNumber?: number;
      isFoil?: boolean;
      foilType?: string | null;
    }>();
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
          },
        });
        if (!existing) return { success: false, message: "Card not found." };

        const updates: Partial<typeof collectionCards.$inferInsert> = {};
        if (card !== undefined) {
          updates.card = card;
          updates.cardId = card.id;
          updates.binNumber = binNumber ?? null;
        }
        if (isFoil !== undefined) updates.isFoil = isFoil;
        if (foilType !== undefined) updates.foilType = foilType;

        await tx
          .update(collectionCards)
          .set(updates)
          .where(eq(collectionCards.id, existing.id));

        return {
          success: true,
          data: toScannedCard({
            guid: scanId,
            card: (card ?? existing.card) as PlayingCardWithDistance,
            scannedAt: existing.scannedAt,
            binNumber:
              card !== undefined ? (binNumber ?? null) : existing.binNumber,
            isFoil: isFoil !== undefined ? isFoil : existing.isFoil,
            foilType: foilType !== undefined ? foilType : existing.foilType,
          }),
        };
      });
      if (result.success) emitToSession(guid, "card_updated", result.data);
      return c.json(result);
    } catch (err) {
      console.error(err);
      emitToSession(guid, "scan_error", {
        message: "Failed to update card.",
        timestamp: Date.now(),
      });
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
