import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toUnmatchedCard } from "./shared";

// GET /collections/:guid/unmatched — cards scanned but not matched to anything
export const listUnmatchedCardsRoute = new Hono<AppEnv>().get(
  "/:guid/unmatched",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true },
        });
        if (!collection)
          return { success: false, message: "Collection not found." };

        const rows = await tx
          .select({
            guid: unmatchedCards.guid,
            capturedImageDataUrl: unmatchedCards.capturedImageDataUrl,
            scannedAt: unmatchedCards.scannedAt,
          })
          .from(unmatchedCards)
          .where(
            and(
              eq(unmatchedCards.collectionId, collection.id),
              eq(unmatchedCards.isDeleted, false),
            ),
          )
          .orderBy(desc(unmatchedCards.scannedAt));

        return { success: true, data: rows.map(toUnmatchedCard) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
