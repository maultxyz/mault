import type { PlayingCardWithDistance, ScannedCard } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards, collections } from "../../db/schema";
import { acquireLock } from "../../lib/scan-lock";
import { emitToOrg, emitToSession } from "../../lib/session-stream";
import { FREE_PLAN_DAILY_SCAN_LIMIT } from "../../lib/stripe";
import { getUserDisplayName, requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { notifyCardScanned } from "./notify-card-scanned";
import { isOverFreeScanLimit } from "./scan-limit";

export const addCollectionCardRoute = new Hono<AppEnv>().post(
  "/:guid/cards",
  requireAuth,
  requireOrg,
  async (c) => {
    const guid = c.req.param("guid");
    const userId = c.get("userId");
    const orgId = c.get("orgId");
    const {
      scanId,
      card,
      scannedAt,
      binNumber,
      capturedImageUrl,
      isFoil,
      foilType,
      alternativeMatches,
    } = await c.req.json<ScannedCard>();

    const displayName = await getUserDisplayName(userId);
    const { ok: lockOk, isNewSession } = acquireLock(
      guid,
      userId,
      orgId,
      displayName,
    );
    if (!lockOk) {
      return c.json(
        {
          success: false,
          message:
            "Another org member is currently scanning into this collection.",
        },
        423,
      );
    }

    type AddCardResult =
      | { success: true; data: ScannedCard }
      | { success: false; message: string; scanLimitReached?: boolean };

    try {
      const { result, collectionName, gameName, gameId } = await authQuery<{
        result: AddCardResult;
        collectionName: string | undefined;
        gameName: string | undefined;
        gameId: number | null;
      }>(c.get("jwtClaims"), async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true, gameId: true, name: true },
        });
        if (!collection)
          return {
            result: { success: false, message: "Collection not found." },
            collectionName: undefined,
            gameName: undefined,
            gameId: null,
          };

        if (await isOverFreeScanLimit(tx, orgId)) {
          return {
            result: {
              success: false,
              message: `Free plan daily scan limit reached (${FREE_PLAN_DAILY_SCAN_LIMIT}/day). Upgrade to Business for unlimited scanning.`,
              scanLimitReached: true,
            },
            collectionName: undefined,
            gameName: undefined,
            gameId: null,
          };
        }

        await tx
          .insert(collectionCards)
          .values({
            guid: scanId,
            collectionId: collection.id,
            cardId: (card as PlayingCardWithDistance).id,
            card,
            scannedAt: new Date(scannedAt),
            binNumber: binNumber ?? null,
            capturedImageDataUrl: capturedImageUrl ?? null,
            isFoil: isFoil ?? false,
            foilType: foilType ?? null,
            alternativeMatches: alternativeMatches?.length
              ? alternativeMatches
              : null,
            orgId,
          })
          .onConflictDoNothing();

        await tx
          .update(collections)
          .set({ updatedAt: new Date() })
          .where(eq(collections.id, collection.id));

        const game = collection.gameId
          ? await tx.query.games.findFirst({
              where: (t, { eq }) => eq(t.id, collection.gameId!),
              columns: { name: true },
            })
          : null;

        return {
          result: {
            success: true,
            data: {
              scanId,
              card,
              scannedAt,
              binNumber,
              capturedImageUrl,
              isFoil,
              foilType,
              alternativeMatches,
            } as ScannedCard,
          },
          collectionName: collection.name,
          gameName: game?.name,
          gameId: collection.gameId,
        };
      });
      if (result.success) {
        emitToSession(guid, "card_added", result.data);
        emitToOrg(orgId, "collections_changed", { guid });

        notifyCardScanned({
          orgId,
          collectionGuid: guid,
          isNewSession,
          card: card as PlayingCardWithDistance,
          isFoil,
          foilType,
          collectionName,
          gameName,
          gameId,
          capturedImageUrl,
        });
      }
      if (!result.success && result.scanLimitReached) {
        return c.json(result, 402);
      }
      return c.json(result);
    } catch (err) {
      console.error(err);
      emitToSession(guid, "scan_error", {
        message: "Failed to save card to collection.",
        timestamp: Date.now(),
      });
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
