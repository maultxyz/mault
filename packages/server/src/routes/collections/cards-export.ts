import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findCardsCollection, loadAllCards } from "./cards-query";

export const exportCollectionCardsRoute = new Hono<AppEnv>().get(
  "/:guid/cards/export",
  requireAuth,
  requireOrg,
  async (c) => {
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await findCardsCollection(
          tx,
          c.req.param("guid"),
          c.get("orgId"),
        );
        if (!collection)
          return { success: false, message: "Collection not found." };

        return { success: true, data: await loadAllCards(tx, collection.id) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
