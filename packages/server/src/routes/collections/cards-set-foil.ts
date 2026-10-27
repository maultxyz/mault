import {
  BULK_SCAN_IDS_MAX,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { findFoilPrinting } from "../../lib/card-search/foil-printing";
import { resolveGameKeyAndLang } from "../../lib/card-search/resolve";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toScannedCard } from "./shared";

export const setCollectionCardsFoilTypeRoute = new Hono<AppEnv>().post(
  "/:guid/cards/foil",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { scanIds, foilType } = await c.req.json<{
      scanIds: string[];
      foilType: string | null;
    }>();
    const isValidFoilType =
      foilType === null || (typeof foilType === "string" && foilType.trim() !== "");
    if (
      !isValidFoilType ||
      !Array.isArray(scanIds) ||
      scanIds.length > BULK_SCAN_IDS_MAX
    ) {
      return c.json({ success: false, message: "Invalid foil type." }, 400);
    }
    if (scanIds.length === 0) return c.json({ success: true, data: null });
    const isFoil = foilType !== null;
    const scope = await resolveGameKeyAndLang(c.get("jwtClaims"), guid);
    const swappedScans = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx
        .update(collectionCards)
        .set({ isFoil, foilType })
        .where(
          and(
            inArray(collectionCards.guid, scanIds),
            eq(collectionCards.orgId, orgId),
          ),
        )
        .returning({
          id: collectionCards.id,
          guid: collectionCards.guid,
          card: collectionCards.card,
          scannedAt: collectionCards.scannedAt,
          binNumber: collectionCards.binNumber,
          isFoil: collectionCards.isFoil,
          foilType: collectionCards.foilType,
          condition: collectionCards.condition,
          language: collectionCards.language,
          isCorrected: collectionCards.isCorrected,
          lowConfidenceMatch: collectionCards.lowConfidenceMatch,
          isReviewed: collectionCards.isReviewed,
        });
      if (!scope) return [];
      const swapped = [];
      for (const row of rows) {
        const foilPrinting = await findFoilPrinting(
          scope.gameKey,
          row.card as PlayingCardWithDistance,
          foilType,
        );
        if (!foilPrinting) continue;
        await tx
          .update(collectionCards)
          .set({ card: foilPrinting, cardId: foilPrinting.id })
          .where(eq(collectionCards.id, row.id));
        swapped.push(toScannedCard({ ...row, card: foilPrinting }));
      }
      return swapped;
    });
    emitToSession(guid, "cards_foil_changed", { scanIds, isFoil, foilType });
    for (const scan of swappedScans) emitToSession(guid, "card_updated", scan);
    return c.json({ success: true, data: null });
  },
);
