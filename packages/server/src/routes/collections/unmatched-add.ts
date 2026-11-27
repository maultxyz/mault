import type {
  ScanSaveRequestFields,
  UnmatchedCard,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { MILO_EMBEDDING_DIM } from "../../lib/constants/card-search";
import { deleteScanImages, storeScanImage } from "../../lib/scan-images";
import { recordDeviceSorted } from "../../lib/device-alerts";
import { recordUnmatchedScan } from "../../lib/scan-stats";
import { lateSaveBinEmptiedAtSql } from "../../lib/bin-emptying";
import { emitToSession } from "../../lib/session-stream";
import {
  markRequestAsCardWrite,
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";
import { findFullBin } from "./bin-limit";
import { isScanSaved } from "./scan-saved";
import { resolveScanDeviceId } from "../../lib/scan-origin";
import { databaseErrorResponse } from "../../lib/database-error-response";
import { startScanSaveTimer } from "../../lib/scan-save-timing";
import { SCAN_SAVE_TRANSACTION_SETTINGS } from "../../lib/constants/timing";

export const addUnmatchedCardRoute = new Hono<AppEnv>().post(
  "/:guid/unmatched",
  requireAuth,
  requireOrg,
  markRequestAsCardWrite,
  rejectWhileImpersonating,
  async (c) => {
    const saveTimer = startScanSaveTimer("unmatched");
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const {
      scanId,
      scannedAt,
      capturedImageUrl,
      capturedBackImageUrl,
      binNumber,
      vectorizedOn,
      diagnostics,
      embedding,
      deviceGuid,
      isRetry,
      startsStorageBatch,
    } = await c.req.json<UnmatchedCard & ScanSaveRequestFields>();
    saveTimer.markStage("requestBodyRead");
    if (
      isRetry &&
      (await isScanSaved(c.get("jwtClaims"), unmatchedCards, scanId))
    ) {
      return c.json({
        success: true,
        data: { scanId, scannedAt, binNumber } as UnmatchedCard,
      });
    }
    saveTimer.markStage("retryCheckDone");
    const [storedImage, storedBackImage] = await Promise.all([
      storeScanImage(
        { orgId, collectionGuid: guid, scanId, kind: "unmatched" },
        capturedImageUrl,
      ),
      storeScanImage(
        { orgId, collectionGuid: guid, scanId, kind: "unmatched", side: "back" },
        capturedBackImageUrl,
      ),
    ]);
    saveTimer.markStage("imagesStored");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        saveTimer.markStage("databaseConnectionAcquired");
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { id: true, gameId: true },
        });
        if (!collection)
          return { success: false, message: "Collection not found." };

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
              success: false,
              message: `Bin ${fullBin.binNumber} is full (${fullBin.count}/${fullBin.capacity} cards). Empty it to continue scanning.`,
              binLimitReached: true,
              binNumber: fullBin.binNumber,
            };
          }
        }

        const scannedByDeviceId = await resolveScanDeviceId(
          tx,
          orgId,
          deviceGuid,
        );
        await tx
          .insert(unmatchedCards)
          .values({
            guid: scanId,
            collectionId: collection.id,
            capturedImageDataUrl: storedImage.dataUrl,
            capturedImageKey: storedImage.key,
            capturedBackImageDataUrl: storedBackImage.dataUrl,
            capturedBackImageKey: storedBackImage.key,
            scannedAt: new Date(scannedAt),
            binNumber: binNumber ?? null,
            startsStorageBatch: startsStorageBatch === true,
            binEmptiedAt: lateSaveBinEmptiedAtSql(
              orgId,
              collection.id,
              binNumber,
              new Date(scannedAt).getTime(),
            ),
            diagnostics: diagnostics ?? null,
            embedding: embedding?.length === MILO_EMBEDDING_DIM ? embedding : null,
            scannedByUserId: c.get("userId"),
            scannedByDeviceId,
            orgId,
          })
          .onConflictDoNothing();

        return {
          success: true,
          data: {
            scanId,
            capturedImageUrl,
            scannedAt,
            binNumber,
            diagnostics,
          } as UnmatchedCard,
        };
      }, SCAN_SAVE_TRANSACTION_SETTINGS);
      saveTimer.markStage("transactionCommitted");
      saveTimer.finish(scanId, result.success ? "saved" : "rejected");
      if (!result.success) deleteScanImages([storedImage.key, storedBackImage.key]);
      if (result.success) {
        void recordUnmatchedScan(
          orgId,
          scanId,
          scannedAt,
          vectorizedOn,
          c.get("userId"),
          deviceGuid,
        );
        void recordDeviceSorted(orgId, deviceGuid);
        emitToSession(orgId, guid, "unmatched_added", result.data);
      }
      if (!result.success && "binLimitReached" in result) {
        return c.json(result, 409);
      }
      return c.json(result);
    } catch (err) {
      saveTimer.finish(scanId, "failed");
      deleteScanImages([storedImage.key, storedBackImage.key]);
      return databaseErrorResponse(c, err);
    }
  },
);
