import type { UnmatchedCard } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { MILO_EMBEDDING_DIM } from "../../lib/constants/card-search";
import { deleteScanImages, storeScanImage } from "../../lib/scan-images";
import { recordUnmatchedScan } from "../../lib/scan-stats";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findFullBin } from "./bin-limit";

// POST /collections/:guid/unmatched — record a scan that found no card match
export const addUnmatchedCardRoute = new Hono<AppEnv>().post(
  "/:guid/unmatched",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const {
      scanId,
      scannedAt,
      capturedImageUrl,
      binNumber,
      vectorizedOn,
      diagnostics,
      embedding,
      deviceGuid,
    } = await c.req.json<UnmatchedCard & { deviceGuid?: string }>();
    const storedImage = await storeScanImage(
      { orgId, collectionGuid: guid, scanId, kind: "unmatched" },
      capturedImageUrl,
    );
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { id: true, gameId: true },
        });
        if (!collection)
          return { success: false, message: "Collection not found." };

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
              success: false,
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
            embedding: embedding?.length === MILO_EMBEDDING_DIM ? embedding : null,
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
      });
      if (!result.success) deleteScanImages([storedImage.key]);
      if (result.success) {
        void recordUnmatchedScan(scanId, scannedAt, vectorizedOn);
        emitToSession(guid, "unmatched_added", result.data);
      }
      if (!result.success && "binLimitReached" in result) {
        return c.json(result, 409);
      }
      return c.json(result);
    } catch (err) {
      deleteScanImages([storedImage.key]);
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
