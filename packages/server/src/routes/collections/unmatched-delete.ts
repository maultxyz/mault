import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { deleteScanImages } from "../../lib/scan-images";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const deleteUnmatchedCardRoute = new Hono<AppEnv>().delete(
  "/:guid/unmatched/:scanId",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const { guid, scanId } = c.req.param();
    const match = and(
      eq(unmatchedCards.guid, scanId),
      eq(unmatchedCards.orgId, orgId),
    );
    const imageKey = await authQuery(c.get("jwtClaims"), async (tx) => {
      const [existing] = await tx
        .select({ imageKey: unmatchedCards.capturedImageKey })
        .from(unmatchedCards)
        .where(match);
      await tx
        .update(unmatchedCards)
        .set({
          isDeleted: true,
          capturedImageKey: null,
          capturedImageDataUrl: null,
        })
        .where(match);
      return existing?.imageKey ?? null;
    });
    deleteScanImages([imageKey]);
    emitToSession(guid, "unmatched_removed", { scanId });
    return c.json({ success: true, data: null });
  },
);
