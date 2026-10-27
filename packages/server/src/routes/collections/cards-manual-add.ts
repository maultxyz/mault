import {
  pickedCardLanguage,
  type AddManualCardRequest,
  type PlayingCardWithDistance,
  type ScannedCard,
} from "@magic-vault/shared";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { findOpenIntakeLotId } from "../../lib/intake";
import { authQuery } from "../../db";
import {
  collectionCards,
  collections,
  storageLocations,
} from "../../db/schema";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import {
  isStorageAllowed,
  STORAGE_UPGRADE_MESSAGE,
} from "../../lib/storage-access";
import { moveCardsToLocation } from "../../lib/storage-locations";
import { emitCardsStoredWebhook } from "../../lib/webhooks/events";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findLocationId } from "../storage-locations/shared";
import { toScannedCard } from "./shared";

export const addManualCollectionCardRoute = new Hono<AppEnv>().post(
  "/:guid/cards/manual",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const guid = c.req.param("guid");
    const { card, locationGuid } = await c.req
      .json<AddManualCardRequest>()
      .catch(() => ({}) as Partial<AddManualCardRequest>);
    if (!card?.id) {
      return c.json({ success: false, message: "A card is required." }, 400);
    }
    if (locationGuid != null && !UUID_PATTERN.test(locationGuid)) {
      return c.json({ success: false, message: "Invalid location." }, 400);
    }
    const added: PlayingCardWithDistance = {
      ...card,
      distance: 0,
      confidence: 1,
    };
    const language = pickedCardLanguage(added);
    const scanId = randomUUID();

    const outcome = await authQuery(c.get("jwtClaims"), async (tx) => {
      const [collection] = await tx
        .select({ id: collections.id })
        .from(collections)
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
        if (!(await isStorageAllowed(tx, orgId))) {
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
            message: "Storage location not found.",
          };
        }
      }

      const scannedAt = new Date();
      await tx.insert(collectionCards).values({
        guid: scanId,
        collectionId: collection.id,
        cardId: added.id,
        card: added,
        scannedAt,
        isFoil: false,
        language,
        isReviewed: true,
        scannedByUserId: userId,
        intakeLotId: await findOpenIntakeLotId(tx, collection.id),
        orgId,
      });

      if (locationId !== null) {
        await moveCardsToLocation(tx, {
          orgId,
          locationId,
          scanIds: [scanId],
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
        card: toScannedCard({
          guid: scanId,
          card: added,
          scannedAt,
          binNumber: null,
          isFoil: false,
          language,
          isReviewed: true,
        }),
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

    const data: ScannedCard = outcome.card;
    emitToSession(guid, "card_added", data);
    emitCollectionCardsChanged(orgId, guid);
    if (locationGuid) emitCardsStoredWebhook(orgId, locationGuid, [scanId]);
    return c.json({ success: true, data });
  },
);
