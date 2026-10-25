import {
  UNMATCHED_PAGE_MAX,
  UNMATCHED_PREVIEW_COUNT,
  type UnmatchedCardsPage,
} from "@magic-vault/shared";
import { and, count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { unmatchedCards } from "../../db/schema";
import { resolveScanImageUrl } from "../../lib/scan-images";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toUnmatchedCard } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

function parseCount(value: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

// GET /collections/:guid/unmatched?limit=&offset= — newest unmatched scans first
export const listUnmatchedCardsRoute = new Hono<AppEnv>().get(
  "/:guid/unmatched",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const limit = Math.max(
      1,
      parseCount(c.req.query("limit"), UNMATCHED_PREVIEW_COUNT, UNMATCHED_PAGE_MAX),
    );
    const offset = parseCount(
      c.req.query("offset"),
      0,
      Number.MAX_SAFE_INTEGER,
    );
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await tx.query.collections.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
          columns: { id: true },
        });
        if (!collection)
          return { success: false, message: "Collection not found." };

        const liveRows = and(
          eq(unmatchedCards.collectionId, collection.id),
          eq(unmatchedCards.isDeleted, false),
        );
        const [{ total }] = await tx
          .select({ total: count(unmatchedCards.id) })
          .from(unmatchedCards)
          .where(liveRows);
        const rows = await tx
          .select({
            guid: unmatchedCards.guid,
            capturedImageDataUrl: unmatchedCards.capturedImageDataUrl,
            capturedImageKey: unmatchedCards.capturedImageKey,
            scannedAt: unmatchedCards.scannedAt,
            binNumber: unmatchedCards.binNumber,
            diagnostics: unmatchedCards.diagnostics,
          })
          .from(unmatchedCards)
          .where(liveRows)
          .orderBy(desc(unmatchedCards.scannedAt), desc(unmatchedCards.id))
          .limit(limit)
          .offset(offset);

        const data: UnmatchedCardsPage = {
          total,
          cards: await Promise.all(
            rows.map(async (row) =>
              toUnmatchedCard({
                ...row,
                capturedImageUrl: await resolveScanImageUrl(row),
              }),
            ),
          ),
        };
        return { success: true, data };
      });
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
