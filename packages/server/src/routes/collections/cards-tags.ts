import {
  cardTagChanges,
  setCardTagsRequestSchema,
  type CardTagsChangedEvent,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { setScansCorrected } from "../../lib/scan-stats";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import { uuidArraySql } from "../../lib/sql-arrays";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const setCollectionCardTagsRoute = new Hono<AppEnv>().post(
  "/:guid/cards/tags",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const parsed = setCardTagsRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) {
      return c.json({ success: false, message: "Invalid card tags." }, 400);
    }
    const { scanIds, tags, enabled } = parsed.data;
    const changes = cardTagChanges(tags, enabled);
    const changedScanIds = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx
        .update(collectionCards)
        .set({
          isDownloaded: changes.isDownloaded,
          isReviewed: changes.reviewed,
          isCorrected: changes.corrected,
          lowConfidenceMatch: changes.lowConfidenceMatch,
        })
        .where(
          and(
            sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
            eq(collectionCards.orgId, orgId),
          ),
        )
        .returning({ scanId: collectionCards.guid });
      return rows.map((row) => row.scanId!);
    });
    if (changedScanIds.length > 0) {
      if (changes.corrected !== undefined) {
        void setScansCorrected(orgId, changedScanIds, changes.corrected);
      }
      const event: CardTagsChangedEvent = {
        scanIds: changedScanIds,
        tags,
        enabled,
      };
      emitToSession(guid, "cards_tags_changed", event);
      emitCollectionCardsChanged(orgId, guid);
    }
    return c.json({ success: true, data: { changedScanIds } });
  },
);
