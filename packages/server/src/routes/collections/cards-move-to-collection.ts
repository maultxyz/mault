import type { MoveCardsToCollectionResult } from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards, collections } from "../../db/schema";
import { logActivity } from "../../lib/activity-log";
import { emitCollectionCardsChanged, emitToSession } from "../../lib/session-stream";
import { uuidArraySql } from "../../lib/sql-arrays";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { parseScanIds } from "./cards-query";

export const moveCollectionCardsToCollectionRoute = new Hono<AppEnv>().post(
  "/:guid/cards/move-to-collection",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const sourceGuid = c.req.param("guid");
    const body = await c.req.json().catch(() => ({}));
    const scanIds = parseScanIds(body);
    const targetCollectionGuid =
      typeof body.targetCollectionGuid === "string" ? body.targetCollectionGuid : null;
    if (!scanIds || !targetCollectionGuid) {
      return c.json({ success: false, message: "Invalid request." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const findCollection = (guid: string) =>
        tx.query.collections.findFirst({
          where: and(
            eq(collections.guid, guid),
            eq(collections.orgId, orgId),
            eq(collections.isDeleted, false),
          ),
          columns: { id: true, guid: true, gameId: true, name: true },
        });
      const source = await findCollection(sourceGuid);
      const target = await findCollection(targetCollectionGuid);
      if (!source || !target || source.id === target.id) {
        return { errorMessage: "Collection not found.", movedScanIds: [] as string[] };
      }
      if (source.gameId !== target.gameId) {
        return {
          errorMessage: "Choose a collection for the same game.",
          movedScanIds: [] as string[],
        };
      }
      const moved = await tx
        .update(collectionCards)
        .set({ collectionId: target.id, binNumber: null, updatedAt: new Date() })
        .where(
          and(
            sql`${collectionCards.guid} = ANY(${uuidArraySql(scanIds)})`,
            eq(collectionCards.collectionId, source.id),
            eq(collectionCards.orgId, orgId),
          ),
        )
        .returning({ guid: collectionCards.guid });
      if (moved.length > 0) {
        await logActivity(tx, {
          orgId,
          userId: c.get("userId"),
          action: "cards.moved",
          summary: target.name,
          details: {
            count: moved.length,
            collectionGuid: source.guid,
            targetCollectionGuid: target.guid,
          },
        });
      }
      return {
        errorMessage: null,
        movedScanIds: moved.map((row) => row.guid!),
      };
    });
    if (result.errorMessage) {
      return c.json({ success: false, message: result.errorMessage }, 400);
    }
    if (result.movedScanIds.length > 0) {
      emitToSession(sourceGuid, "cards_removed", { scanIds: result.movedScanIds });
      emitCollectionCardsChanged(orgId, sourceGuid);
    }
    const data: MoveCardsToCollectionResult = { moved: result.movedScanIds.length };
    return c.json({ success: true, data });
  },
);
