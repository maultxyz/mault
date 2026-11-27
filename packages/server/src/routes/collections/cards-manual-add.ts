import {
  MANUAL_CARD_ADD_MAX_QUANTITY,
  detectedFoilFamily,
  pickedCardLanguage,
  resolveScanFoilType,
  toCardCondition,
  type AddManualCardRequest,
  type AddManualCardResult,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { findOpenIntakeLotId } from "../../lib/intake";
import { authQuery } from "../../db";
import {
  collectionCards,
  collections,
  games,
  storageLocations,
} from "../../db/schema";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import { moveCardsToLocation } from "../../lib/storage-locations";
import { emitCardsStoredWebhook } from "../../lib/webhooks/events";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findLocationId } from "../storage-locations/shared";
import { toScannedCard } from "./shared";
import { toSavedCardSnapshots } from "../../lib/saved-cards";
import { orgHasFeature } from "../../lib/plan-config";
import { STORAGE_UPGRADE_MESSAGE } from "../../lib/constants/plan-access";
import { STORAGE_LOCATION_NOT_FOUND_MESSAGE } from "../../lib/constants/storage-locations";

export const addManualCollectionCardRoute = new Hono<AppEnv>().post(
  "/:guid/cards/manual",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const guid = c.req.param("guid");
    const { card, locationGuid, quantity = 1, isFoil, condition } = await c.req
      .json<AddManualCardRequest>()
      .catch(() => ({}) as Partial<AddManualCardRequest>);
    if (!card?.id) {
      return c.json({ success: false, message: "A card is required." }, 400);
    }
    if (locationGuid != null && !UUID_PATTERN.test(locationGuid)) {
      return c.json({ success: false, message: "Invalid location." }, 400);
    }
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MANUAL_CARD_ADD_MAX_QUANTITY
    ) {
      return c.json({ success: false, message: "Invalid quantity." }, 400);
    }
    const savedCondition = toCardCondition(condition);
    const added: PlayingCardWithDistance = {
      ...card,
      distance: 0,
      confidence: 1,
    };
    const language = pickedCardLanguage(added);
    const scanIds = Array.from({ length: quantity }, () => randomUUID());

    const outcome = await authQuery(c.get("jwtClaims"), async (tx) => {
      const [collection] = await tx
        .select({ id: collections.id, lang: collections.lang, gameKey: games.key })
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

      let locationId: number | null = null;
      if (locationGuid) {
        if (!(await orgHasFeature(tx, orgId, "storage"))) {
          return {
            status: 402 as const,
            message: STORAGE_UPGRADE_MESSAGE,
            upgradeRequired: true,
          };
        }
        locationId = await findLocationId(tx, orgId, locationGuid);
        if (locationId === null) {
          return {
            status: 404 as const,
            message: STORAGE_LOCATION_NOT_FOUND_MESSAGE,
          };
        }
      }

      const foilType = resolveScanFoilType({
        card: added,
        sessionFoilType:
          isFoil === true && !added.hasNoFoilPrinting
            ? detectedFoilFamily(added, [], collection.gameKey)
            : null,
        foilDetection: null,
        fallbackFoilTypes: [],
        gameKey: collection.gameKey,
        isNudgeFoilDetectionEnabled: false,
        isFoilStarDetectionEnabled: false,
      });
      const firstScannedAtMs = Date.now();
      const scannedAtOfCopy = (copyIndex: number) =>
        new Date(firstScannedAtMs + copyIndex);
      const saved = await toSavedCardSnapshots(
        { gameKey: collection.gameKey, lang: collection.lang },
        added,
        null,
      );
      const intakeLotId = await findOpenIntakeLotId(tx, collection.id);
      await tx.insert(collectionCards).values(
        scanIds.map((scanId, copyIndex) => ({
          guid: scanId,
          collectionId: collection.id,
          cardId: added.id,
          card: saved.card,
          scannedAt: scannedAtOfCopy(copyIndex),
          isFoil: foilType != null,
          foilType,
          condition: savedCondition,
          language,
          isReviewed: true,
          scannedByUserId: userId,
          intakeLotId,
          orgId,
        })),
      );

      if (locationId !== null) {
        await moveCardsToLocation(tx, {
          orgId,
          locationId,
          scanIds,
        });
        await tx
          .update(storageLocations)
          .set({ lastUsedAt: new Date() })
          .where(eq(storageLocations.id, locationId));
      }

      await tx
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, collection.id));

      return {
        status: 200 as const,
        cards: scanIds.map((scanId, copyIndex) =>
          toScannedCard({
            guid: scanId,
            card: added,
            scannedAt: scannedAtOfCopy(copyIndex),
            binNumber: null,
            isFoil: foilType != null,
            foilType,
            condition: savedCondition,
            language,
            isReviewed: true,
          }),
        ),
      };
    });

    if (outcome.status !== 200) {
      if ("upgradeRequired" in outcome) {
        return c.json({
          success: false,
          message: outcome.message,
          upgradeRequired: true,
        });
      }
      return c.json(
        { success: false, message: outcome.message },
        outcome.status,
      );
    }

    for (const addedCard of outcome.cards) {
      emitToSession(orgId, guid, "card_added", addedCard);
    }
    emitCollectionCardsChanged(orgId, guid);
    if (locationGuid) emitCardsStoredWebhook(orgId, locationGuid, scanIds);
    const result: AddManualCardResult = {
      success: true,
      data: outcome.cards[0],
      addedScanIds: scanIds,
    };
    return c.json(result);
  },
);
