import type { UnmatchedCard } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
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
    const { scanId, scannedAt, capturedImageUrl, binNumber, deviceGuid } =
      await c.req.json<UnmatchedCard & { deviceGuid?: string }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
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
            capturedImageDataUrl: capturedImageUrl ?? null,
            scannedAt: new Date(scannedAt),
            binNumber: binNumber ?? null,
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
          } as UnmatchedCard,
        };
      });
      if (result.success) emitToSession(guid, "unmatched_added", result.data);
      if (!result.success && "binLimitReached" in result) {
        return c.json(result, 409);
      }
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
