import { isCardCondition, type CardCondition } from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { logActivity } from "../../lib/activity-log";
import { collectionCards } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const setCollectionCardsConditionRoute = new Hono<AppEnv>().post(
  "/:guid/cards/condition",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { scanIds, condition } = await c.req.json<{
      scanIds: string[];
      condition: CardCondition;
    }>();
    if (!isCardCondition(condition) || !Array.isArray(scanIds)) {
      return c.json({ success: false, message: "Invalid condition." }, 400);
    }
    if (scanIds.length === 0) return c.json({ success: true, data: null });
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        await tx
          .update(collectionCards)
          .set({ condition })
          .where(
            and(
              inArray(collectionCards.guid, scanIds),
              eq(collectionCards.orgId, orgId),
            ),
          );
        await logActivity(tx, {
          orgId,
          userId: c.get("userId"),
          action: "cards.condition",
          summary: condition,
          details: { count: scanIds.length, collectionGuid: guid, condition },
        });
        return { success: true, data: null };
      });
      if (result.success) {
        emitToSession(guid, "cards_condition_changed", { scanIds, condition });
      }
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
