import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  findCardsCollection,
  loadCardIds,
  parseCardsQuery,
} from "./cards-query";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const collectionCardIdsRoute = new Hono<AppEnv>().get(
  "/:guid/cards/ids",
  requireAuth,
  requireOrg,
  async (c) => {
    const query = parseCardsQuery(c.req.query());
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const collection = await findCardsCollection(
          tx,
          c.req.param("guid"),
          c.get("orgId"),
        );
        if (!collection)
          return { success: false, message: "Collection not found." };

        const data = await loadCardIds(
          tx,
          collection,
          query,
        );
        return { success: true, data };
      });
      return c.json(result);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
