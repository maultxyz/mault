import type { PlayingCardWithDistance } from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { authQuery } from "../../db";
import { collectionCards, collections, games, unmatchedCards } from "../../db/schema";
import {
  acquireDeviceLease,
  UNIDENTIFIED_SORTER_LEASE_KEY,
} from "../device-leases";
import type {
  SaveMatchedScanInput,
  SaveScanResult,
  SaveUnmatchedScanInput,
} from "../interfaces/save-scan";
import { MILO_EMBEDDING_DIM } from "../constants/card-search";
import { acquireLock } from "../scan-lock";
import { deleteScanImages, storeScanImage } from "../scan-images";
import { recordMatchedScan, recordUnmatchedScan } from "../scan-stats";
import { sorterLimitForPlan, sorterLimitMessage } from "../sorter-limit";
import {
  consumeDailyScan,
  dailyScanLimitForPlan,
  dailyScanLimitMessage,
  getScansToday,
} from "../scan-usage";
import { emitToOrg, emitToSession } from "../session-stream";
import { emitCardScannedWebhook } from "../webhooks/events";
import { getUserDisplayName } from "../../middleware/auth";
import { findFullBin } from "../../routes/collections/bin-limit";
import { notifyCardScanned } from "../../routes/collections/notify-card-scanned";
import { loadOrgPlan } from "../../routes/collections/scan-limit";

export async function saveMatchedScan(
  input: SaveMatchedScanInput,
): Promise<SaveScanResult> {
  const {
    jwtClaims,
    userId,
    orgId,
    collectionGuid,
    scanId,
    card,
    scannedAt,
    binNumber,
    capturedImageUrl,
    isFoil,
    foilType,
    alternativeMatches,
    needsReview,
    diagnostics,
    vectorizedOn,
    deviceGuid,
  } = input;

  const displayName = await getUserDisplayName(userId);
  const { ok: lockOk, isNewSession } = acquireLock(
    collectionGuid,
    userId,
    orgId,
    displayName,
  );
  if (!lockOk) {
    return {
      success: false,
      message: "Another org member is currently scanning into this collection.",
    };
  }

  const storedImage = await storeScanImage(
    { orgId, collectionGuid, scanId, kind: "cards" },
    capturedImageUrl,
  );
  try {
    const { result, collectionName, gameName, gameId } = await authQuery<{
      result: SaveScanResult;
      collectionName: string | undefined;
      gameName: string | undefined;
      gameId: number | null;
    }>(jwtClaims, async (tx) => {
      const [collection] = await tx
        .select({
          id: collections.id,
          gameId: collections.gameId,
          name: collections.name,
          gameName: games.name,
        })
        .from(collections)
        .leftJoin(games, eq(games.id, collections.gameId))
        .where(
          and(
            eq(collections.guid, collectionGuid),
            eq(collections.orgId, orgId),
            eq(collections.isDeleted, false),
          ),
        )
        .limit(1);
      if (!collection) {
        return {
          result: { success: false, message: "Collection not found." },
          collectionName: undefined,
          gameName: undefined,
          gameId: null,
        };
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
      if (dailyLimit != null && (await getScansToday(tx, orgId)) >= dailyLimit) {
        return scanLimitReachedResult;
      }

      const sorterLimit = sorterLimitForPlan(plan);
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

      if (binNumber != null) {
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
              message: `Bin ${fullBin.binNumber} is full (${fullBin.count}/${fullBin.cardLimit} cards). Empty it to continue scanning.`,
              binLimitReached: true,
              binNumber: fullBin.binNumber,
            },
            collectionName: undefined,
            gameName: undefined,
            gameId: null,
          };
        }
      }

      const [alreadySaved] = await tx
        .select({ id: collectionCards.id })
        .from(collectionCards)
        .where(eq(collectionCards.guid, scanId))
        .limit(1);
      if (!alreadySaved && !(await consumeDailyScan(orgId, plan))) {
        return scanLimitReachedResult;
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
          capturedImageDataUrl: storedImage.dataUrl,
          capturedImageKey: storedImage.key,
          isFoil: isFoil ?? false,
          foilType: foilType ?? null,
          alternativeMatches: alternativeMatches?.length
            ? alternativeMatches
            : null,
          lowConfidenceMatch: needsReview ?? false,
          diagnostics: diagnostics ?? null,
          orgId,
        })
        .onConflictDoNothing();

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
            alternativeMatches,
            lowConfidenceMatch: needsReview,
          },
        },
        collectionName: collection.name,
        gameName: collection.gameName ?? undefined,
        gameId: collection.gameId,
      };
    });
    if (!result.success) deleteScanImages([storedImage.key]);
    if (result.success) {
      void recordMatchedScan(
        orgId,
        scanId,
        card,
        !!alternativeMatches?.length,
        scannedAt,
        vectorizedOn,
      );
      emitToSession(collectionGuid, "card_added", result.data);
      emitToOrg(orgId, "collections_changed", { guid: collectionGuid });
      notifyCardScanned({
        orgId,
        collectionGuid,
        isNewSession,
        card,
        isFoil,
        foilType,
        collectionName,
        gameName,
        gameId,
        capturedImageUrl,
      });
      emitCardScannedWebhook(orgId, scanId);
    }
    return result;
  } catch (err) {
    deleteScanImages([storedImage.key]);
    console.error(err);
    emitToSession(collectionGuid, "scan_error", {
      message: "Failed to save card to collection.",
      timestamp: Date.now(),
    });
    return { success: false, message: "Database error." };
  }
}

export async function saveUnmatchedScan(
  input: SaveUnmatchedScanInput,
): Promise<SaveScanResult> {
  const {
    jwtClaims,
    orgId,
    collectionGuid,
    scanId,
    scannedAt,
    capturedImageUrl,
    binNumber,
    vectorizedOn,
    diagnostics,
    embedding,
    deviceGuid,
  } = input;
  const storedImage = await storeScanImage(
    { orgId, collectionGuid, scanId, kind: "unmatched" },
    capturedImageUrl,
  );
  try {
    const result = await authQuery(jwtClaims, async (tx) => {
      const collection = await tx.query.collections.findFirst({
        where: (t, { eq, and }) =>
          and(
            eq(t.guid, collectionGuid),
            eq(t.orgId, orgId),
            eq(t.isDeleted, false),
          ),
        columns: { id: true, gameId: true },
      });
      if (!collection) {
        return { success: false as const, message: "Collection not found." };
      }

      if (binNumber != null) {
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
            success: false as const,
            message: `Bin ${fullBin.binNumber} is full (${fullBin.count}/${fullBin.cardLimit} cards). Empty it to continue scanning.`,
            binLimitReached: true,
            binNumber: fullBin.binNumber,
          };
        }
      }

      await tx
        .insert(unmatchedCards)
        .values({
          guid: scanId,
          collectionId: collection.id,
          capturedImageDataUrl: storedImage.dataUrl,
          capturedImageKey: storedImage.key,
          scannedAt: new Date(scannedAt),
          binNumber: binNumber ?? null,
          diagnostics: diagnostics ?? null,
          embedding:
            embedding?.length === MILO_EMBEDDING_DIM ? embedding : null,
          orgId,
        })
        .onConflictDoNothing();

      return {
        success: true as const,
        data: {
          scanId,
          capturedImageUrl,
          scannedAt,
          binNumber,
          diagnostics,
        },
      };
    });
    if (!result.success) deleteScanImages([storedImage.key]);
    if (result.success) {
      void recordUnmatchedScan(orgId, scanId, scannedAt, vectorizedOn);
      emitToSession(collectionGuid, "unmatched_added", result.data);
    }
    return result;
  } catch (err) {
    deleteScanImages([storedImage.key]);
    console.error(err);
    return { success: false, message: "Database error." };
  }
}
