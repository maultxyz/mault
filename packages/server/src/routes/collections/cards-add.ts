import {
  DEFAULT_CARD_CONDITION,
  toCardCondition,
  type PlayingCardWithDistance,
  type ScanSaveRequestFields,
  type ScannedCard,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards, collections, storageLocations } from "../../db/schema";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { moveCardsToLocation } from "../../lib/storage-locations";
import { findLocationId } from "../storage-locations/shared";
import {
  acquireDeviceLease,
  UNIDENTIFIED_SORTER_LEASE_KEY,
} from "../../lib/device-leases";
import { acquireLock } from "../../lib/scan-lock";
import { deleteScanImages, storeScanImage } from "../../lib/scan-images";
import { recordDeviceSorted } from "../../lib/device-alerts";
import { loadScanSaveContext } from "../../lib/scan-save-context";
import { lateSaveBinEmptiedAtSql } from "../../lib/bin-emptying";
import { recordMatchedScan } from "../../lib/scan-stats";
import {
  consumeDailyScan,
  dailyScanLimitForPlan,
  dailyScanLimitMessage,
} from "../../lib/scan-usage";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import {
  getUserDisplayName,
  markRequestAsCardWrite,
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { findFullBin } from "./bin-limit";
import { isScanSaved } from "./scan-saved";
import {
  emitCardScannedWebhook,
  emitCardsStoredWebhook,
} from "../../lib/webhooks/events";
import { notifyCardScanned } from "./notify-card-scanned";
import { loadOrgPlan } from "./scan-limit";
import { databaseErrorResponse } from "../../lib/database-error-response";
import {
  applyScanSaveTimeouts,
  startScanSaveTimer,
} from "../../lib/scan-save-timing";
import { toSavedCardSnapshots } from "../../lib/saved-cards";
import { findCardToResort, moveResortedCard } from "../../lib/resort-scan";
import {
  applyScanPickListUpdate,
  insertScanWithPickList,
  isScanSavePickListUpdate,
} from "../../lib/scan-pick-list";
import { sorterLimitMessage } from "../../lib/plan-limit-messages";
import { connectedSorterLimitForPlan, orgHasFeature } from "../../lib/plan-config";
import { STORAGE_UPGRADE_MESSAGE } from "../../lib/constants/plan-access";
import { STORAGE_LOCATION_NOT_FOUND_MESSAGE } from "../../lib/constants/storage-locations";

export const addCollectionCardRoute = new Hono<AppEnv>().post(
  "/:guid/cards",
  requireAuth,
  requireOrg,
  markRequestAsCardWrite,
  rejectWhileImpersonating,
  async (c) => {
    const saveTimer = startScanSaveTimer("card");
    const guid = c.req.param("guid");
    const userId = c.get("userId");
    const orgId = c.get("orgId");
    const {
      scanId,
      card,
      scannedAt,
      binNumber,
      capturedImageUrl,
      capturedBackImageUrl,
      isFoil,
      foilType,
      stamp,
      condition: requestedCondition,
      alternativeMatches,
      lowConfidenceMatch,
      diagnostics,
      vectorizedOn,
      deviceGuid,
      isRetry,
      pickListUpdate,
      storageLocationGuid,
    } = await c.req.json<ScannedCard & ScanSaveRequestFields>();
    saveTimer.markStage("requestBodyRead");
    if (pickListUpdate !== undefined && !isScanSavePickListUpdate(pickListUpdate))
      return c.json({ success: false, message: "Invalid pick-list update." }, 400);
    if (storageLocationGuid != null && !UUID_PATTERN.test(storageLocationGuid))
      return c.json({ success: false, message: "Invalid storage location." }, 400);
    const condition = toCardCondition(requestedCondition ?? DEFAULT_CARD_CONDITION);

    if (
      isRetry &&
      (await isScanSaved(c.get("jwtClaims"), collectionCards, scanId))
    ) {
      return c.json({
        success: true,
        data: { scanId, card, scannedAt, binNumber } as ScannedCard,
      });
    }

    saveTimer.markStage("retryCheckDone");
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
      | {
          success: false;
          message: string;
          scanLimitReached?: boolean;
          sorterLimitReached?: boolean;
          binLimitReached?: boolean;
          binNumber?: number;
          storageLocationUnavailable?: boolean;
        };

    let keepOnlyExistingImage = false;
    const storedImagesRequest = saveTimer.markStageWhenSettled(
      "imagesStored",
      Promise.all([
        storeScanImage(
          { orgId, collectionGuid: guid, scanId, kind: "cards" },
          capturedImageUrl,
        ),
        storeScanImage(
          { orgId, collectionGuid: guid, scanId, kind: "cards", side: "back" },
          capturedBackImageUrl,
        ),
      ]),
    );
    storedImagesRequest.catch(() => undefined);
    const deleteStoredImages = async () => {
      const [storedImage, storedBackImage] = await storedImagesRequest;
      deleteScanImages([storedImage.key, storedBackImage.key]);
    };
    try {
      const { result, collectionName, gameName, gameId } = await authQuery<{
        result: AddCardResult;
        collectionName: string | undefined;
        gameName: string | undefined;
        gameId: number | null;
      }>(c.get("jwtClaims"), async (tx) => {
        saveTimer.markStage("databaseConnectionAcquired");
        await applyScanSaveTimeouts(tx);
        const saveContext = await loadScanSaveContext(tx, {
          orgId,
          collectionGuid: guid,
          scanId,
          deviceGuid,
        });
        if (!saveContext)
          return {
            result: { success: false, message: "Collection not found." },
            collectionName: undefined,
            gameName: undefined,
            gameId: null,
          };
        const {
          collection,
          scansToday,
          isAlreadySaved: alreadySaved,
          scannedByDeviceId,
          openIntakeLotId: intakeLotId,
        } = saveContext;

        const savedCardSnapshotsRequest = toSavedCardSnapshots(
          { gameKey: collection.gameKey, lang: collection.lang },
          card,
          alternativeMatches,
        );
        savedCardSnapshotsRequest.catch(() => undefined);

        let storageLocationId: number | null = null;
        if (storageLocationGuid) {
          const storageAllowed = await orgHasFeature(tx, orgId, "storage");
          storageLocationId = storageAllowed
            ? await findLocationId(tx, orgId, storageLocationGuid)
            : null;
          if (storageLocationId === null) {
            return {
              result: {
                success: false,
                message: storageAllowed
                  ? STORAGE_LOCATION_NOT_FOUND_MESSAGE
                  : STORAGE_UPGRADE_MESSAGE,
                storageLocationUnavailable: true,
              },
              collectionName: undefined,
              gameName: undefined,
              gameId: null,
            };
          }
        }

        const plan = await loadOrgPlan(tx, orgId);
        const dailyLimit = dailyScanLimitForPlan(plan);
        const scanLimitReachedResult = {
          result: {
            success: false as const,
            message: dailyScanLimitMessage(dailyLimit),
            scanLimitReached: true,
          },
          collectionName: undefined,
          gameName: undefined,
          gameId: null,
        };
        if (dailyLimit != null && scansToday >= dailyLimit) {
          return scanLimitReachedResult;
        }

        const sorterLimit = connectedSorterLimitForPlan(plan);
        if (
          !acquireDeviceLease(
            orgId,
            deviceGuid ?? UNIDENTIFIED_SORTER_LEASE_KEY,
            sorterLimit,
          )
        ) {
          return {
            result: {
              success: false,
              message: sorterLimitMessage(sorterLimit),
              sorterLimitReached: true,
            },
            collectionName: undefined,
            gameName: undefined,
            gameId: null,
          };
        }

        if (binNumber != null && !isRetry) {
          const fullBin = await findFullBin(
            tx,
            orgId,
            collection.gameId,
            collection.id,
            binNumber,
            deviceGuid,
          );
          if (fullBin) {
            return {
              result: {
                success: false,
                message: `Bin ${fullBin.binNumber} is full (${fullBin.count}/${fullBin.capacity} cards). Empty it to continue scanning.`,
                binLimitReached: true,
                binNumber: fullBin.binNumber,
              },
              collectionName: undefined,
              gameName: undefined,
              gameId: null,
            };
          }
        }

        if (!alreadySaved && !(await consumeDailyScan(orgId, plan))) {
          return scanLimitReachedResult;
        }

        const cardToResort =
          alreadySaved || storageLocationId !== null
            ? null
            : await findCardToResort(tx, {
                orgId,
                collectionId: collection.id,
                gameId: collection.gameId,
                cardId: (card as PlayingCardWithDistance).id,
                scanIsFoil: isFoil ?? false,
              });
        const [storedImage, storedBackImage] = await storedImagesRequest;
        if (cardToResort) {
          await moveResortedCard(tx, {
            rowId: cardToResort.id,
            orgId,
            collectionId: collection.id,
            scanId,
            scannedAt,
            binNumber,
            scannedByUserId: userId,
            scannedByDeviceId,
            capturedImage: cardToResort.hasCapturedImage ? null : storedImage,
            capturedBackImage: cardToResort.hasCapturedImage ? null : storedBackImage,
          });
          await applyScanPickListUpdate(tx, orgId, pickListUpdate);
          if (cardToResort.hasCapturedImage) keepOnlyExistingImage = true;
          await tx
            .update(collections)
            .set({ updatedAt: new Date() })
            .where(eq(collections.id, collection.id));
          return {
            result: {
              success: true,
              data: {
                scanId,
                card,
                scannedAt,
                binNumber,
                capturedImageUrl,
                isFoil: cardToResort.isFoil,
                foilType: cardToResort.foilType ?? undefined,
                stamp: cardToResort.stamp ?? undefined,
                condition: toCardCondition(cardToResort.condition),
                alternativeMatches,
                lowConfidenceMatch,
              } as ScannedCard,
            },
            collectionName: collection.name,
            gameName: collection.gameName ?? undefined,
            gameId: collection.gameId,
          };
        }

        const saved = await savedCardSnapshotsRequest;
        await insertScanWithPickList(
          tx,
          {
            guid: scanId,
            collectionId: collection.id,
            cardId: (card as PlayingCardWithDistance).id,
            card: saved.card,
            scannedAt: new Date(scannedAt),
            binNumber: binNumber ?? null,
            binEmptiedAt: lateSaveBinEmptiedAtSql(
              orgId,
              collection.id,
              binNumber,
              new Date(scannedAt).getTime(),
            ),
            capturedImageDataUrl: storedImage.dataUrl,
            capturedImageKey: storedImage.key,
            capturedBackImageDataUrl: storedBackImage.dataUrl,
            capturedBackImageKey: storedBackImage.key,
            isFoil: isFoil ?? false,
            foilType: foilType ?? null,
            stamp: stamp ?? null,
            condition,
            alternativeMatches: saved.alternativeMatches,
            lowConfidenceMatch: lowConfidenceMatch ?? false,
            diagnostics: diagnostics ?? null,
            scannedByUserId: userId,
            scannedByDeviceId,
            intakeLotId,
            orgId,
          },
          pickListUpdate,
        );

        if (storageLocationId !== null && !alreadySaved) {
          await moveCardsToLocation(tx, {
            orgId,
            locationId: storageLocationId,
            scanIds: [scanId],
          });
          await tx
            .update(storageLocations)
            .set({ lastUsedAt: new Date() })
            .where(eq(storageLocations.id, storageLocationId));
        }

        await tx
          .update(collections)
          .set({ updatedAt: new Date() })
          .where(eq(collections.id, collection.id));


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
              stamp,
              condition,
              alternativeMatches,
              lowConfidenceMatch,
            } as ScannedCard,
          },
          collectionName: collection.name,
          gameName: collection.gameName ?? undefined,
          gameId: collection.gameId,
        };
      });
      saveTimer.markStage("transactionCommitted");
      saveTimer.finish(scanId, result.success ? "saved" : "rejected");
      if (!result.success || keepOnlyExistingImage) {
        await deleteStoredImages();
      }
      if (result.success) {
        void recordMatchedScan(
          orgId,
          scanId,
          card as PlayingCardWithDistance,
          !!alternativeMatches?.length,
          scannedAt,
          vectorizedOn,
          userId,
        );
        void recordDeviceSorted(orgId, deviceGuid);
        emitToSession(orgId, guid, "card_added", result.data);
        emitCollectionCardsChanged(orgId, guid);

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
        emitCardScannedWebhook(orgId, scanId);
        if (storageLocationGuid)
          emitCardsStoredWebhook(orgId, storageLocationGuid, [scanId]);
      }
      if (
        !result.success &&
        (result.scanLimitReached || result.sorterLimitReached)
      ) {
        return c.json(result, 402);
      }
      if (!result.success && result.binLimitReached) {
        return c.json(result, 409);
      }
      return c.json(result);
    } catch (err) {
      saveTimer.finish(scanId, "failed");
      await deleteStoredImages();
      emitToSession(orgId, guid, "scan_error", {
        message: "Failed to save card to collection.",
        timestamp: Date.now(),
      });
      return databaseErrorResponse(c, err);
    }
  },
);
