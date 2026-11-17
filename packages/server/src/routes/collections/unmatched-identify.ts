import {
  pickedCardLanguage,
  type IdentifyUnmatchedCardRequest,
  type PlayingCardWithDistance,
  type ScannedCard,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { findOpenIntakeLotId } from "../../lib/intake";
import { authQuery } from "../../db";
import {
  collectionCards,
  collections,
  games,
  unmatchedCards,
} from "../../db/schema";
import { resolveScanImageUrl } from "../../lib/scan-images";
import { markScanCorrected } from "../../lib/scan-stats";
import {
  consumeDailyScan,
  dailyScanLimitForPlan,
  dailyScanLimitMessage,
} from "../../lib/scan-usage";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { emitCardScannedWebhook } from "../../lib/webhooks/events";
import { notifyCardScanned } from "./notify-card-scanned";
import { loadOrgPlan } from "./scan-limit";
import { toScannedCard } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";
import { toSavedCardSnapshots } from "../../lib/saved-cards";

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
    const identified: PlayingCardWithDistance = {
      ...card,
      distance: 0,
      confidence: 1,
    };

    try {
      const outcome = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [collection] = await tx
          .select({
            id: collections.id,
            gameId: collections.gameId,
            name: collections.name,
            lang: collections.lang,
            gameKey: games.key,
            gameName: games.name,
          })
          .from(collections)
          .leftJoin(games, eq(games.id, collections.gameId))
          .where(
            and(
              eq(collections.guid, guid),
              eq(collections.orgId, orgId),
              eq(collections.isDeleted, false),
            ),
          )
          .limit(1);
        if (!collection) {
          return { status: 404 as const, message: "Collection not found." };
        }

        const [unmatched] = await tx
          .select()
          .from(unmatchedCards)
          .where(
            and(
              eq(unmatchedCards.guid, scanId),
              eq(unmatchedCards.orgId, orgId),
              eq(unmatchedCards.collectionId, collection.id),
              eq(unmatchedCards.isDeleted, false),
            ),
          )
          .limit(1);
        if (!unmatched) {
          return { status: 404 as const, message: "Unmatched scan not found." };
        }

        const plan = await loadOrgPlan(tx, orgId);
        if (!(await consumeDailyScan(orgId, plan))) {
          return {
            status: 402 as const,
            message: dailyScanLimitMessage(dailyScanLimitForPlan(plan)),
            scanLimitReached: true,
          };
        }

        const saved = await toSavedCardSnapshots(
          { gameKey: collection.gameKey, lang: collection.lang },
          identified,
          null,
        );
        await tx.insert(collectionCards).values({
          guid: scanId,
          collectionId: collection.id,
          cardId: identified.id,
          card: saved.card,
          scannedAt: unmatched.scannedAt,
          binNumber: unmatched.binNumber,
          binEmptiedAt: unmatched.binEmptiedAt,
          capturedImageDataUrl: unmatched.capturedImageDataUrl,
          capturedImageKey: unmatched.capturedImageKey,
          isFoil: isFoil ?? foilType != null,
          foilType: foilType ?? null,
          language: pickedCardLanguage(identified),
          isCorrected: true,
          isReviewed: true,
          scannedByUserId: unmatched.scannedByUserId,
          scannedByDeviceId: unmatched.scannedByDeviceId,
          intakeLotId: await findOpenIntakeLotId(tx, collection.id),
          orgId,
        });

        await tx
          .update(unmatchedCards)
          .set({
            isDeleted: true,
            capturedImageKey: null,
            capturedImageDataUrl: null,
          })
          .where(eq(unmatchedCards.id, unmatched.id));

        await tx
          .update(collections)
          .set({ updatedAt: new Date() })
          .where(eq(collections.id, collection.id));

        const scannedCard = toScannedCard({
          guid: scanId,
          card: identified,
          scannedAt: unmatched.scannedAt,
          binNumber: unmatched.binNumber,
          isFoil: isFoil ?? foilType != null,
          foilType: foilType ?? null,
          language: pickedCardLanguage(identified),
          isCorrected: true,
          isReviewed: true,
        });

        return {
          status: 200 as const,
          card: scannedCard,
          collection,
          image: {
            capturedImageKey: unmatched.capturedImageKey,
            capturedImageDataUrl: unmatched.capturedImageDataUrl,
          },
        };
      });

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

      const data: ScannedCard = outcome.card;
      void markScanCorrected(scanId);
      emitToSession(guid, "unmatched_removed", { scanId });
      emitToSession(guid, "card_added", data);
      emitCollectionCardsChanged(orgId, guid);
      notifyCardScanned({
        orgId,
        collectionGuid: guid,
        isNewSession: false,
        card: identified,
        isFoil: data.isFoil,
        foilType: data.foilType,
        collectionName: outcome.collection.name,
        gameName: outcome.collection.gameName ?? undefined,
        gameId: outcome.collection.gameId,
        capturedImageUrl: await resolveScanImageUrl(outcome.image),
      });
      emitCardScannedWebhook(orgId, scanId);

      return c.json({ success: true, data });
    } catch (err) {
      emitToSession(guid, "scan_error", {
        message: "Failed to add the identified card.",
        timestamp: Date.now(),
      });
      return databaseErrorResponse(c, err);
    }
  },
);
