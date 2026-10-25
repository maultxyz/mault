import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { collectionCards } from "../../db/schema";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const setCollectionCardsFoilTypeRoute = new Hono<AppEnv>().post(
  "/:guid/cards/foil",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { scanIds, foilType } = await c.req.json<{
      scanIds: string[];
      foilType: string | null;
    }>();
    const isValidFoilType =
      foilType === null || (typeof foilType === "string" && foilType.trim() !== "");
    if (!isValidFoilType || !Array.isArray(scanIds)) {
      return c.json({ success: false, message: "Invalid foil type." }, 400);
    }
    if (scanIds.length === 0) return c.json({ success: true, data: null });
    const isFoil = foilType !== null;
    await authQuery(c.get("jwtClaims"), (tx) =>
      tx
        .update(collectionCards)
        .set({ isFoil, foilType })
        .where(
          and(
            inArray(collectionCards.guid, scanIds),
            eq(collectionCards.orgId, orgId),
          ),
        ),
    );
    emitToSession(guid, "cards_foil_changed", { scanIds, isFoil, foilType });
    return c.json({ success: true, data: null });
  },
);
