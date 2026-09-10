import type { UnmatchedCard } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// POST /collections/:guid/unmatched — record a scan that found no card match
export const addUnmatchedCardRoute = new Hono<AppEnv>().post(
  "/:guid/unmatched",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { scanId, scannedAt, capturedImageUrl } =
      await c.req.json<UnmatchedCard>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true },
        });
        if (!collection)
          return { success: false, message: "Collection not found." };

        await tx
          .insert(unmatchedCards)
          .values({
            guid: scanId,
            collectionId: collection.id,
            capturedImageDataUrl: capturedImageUrl ?? null,
            scannedAt: new Date(scannedAt),
            orgId,
          })
          .onConflictDoNothing();

        return {
          success: true,
          data: { scanId, capturedImageUrl, scannedAt } as UnmatchedCard,
        };
      });
      if (result.success) emitToSession(guid, "unmatched_added", result.data);
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
