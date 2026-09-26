import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  cardFilterSql,
  findCardsCollection,
  loadCardStats,
  parseCardsQuery,
} from "./cards-query";

export const collectionCardsSummaryRoute = new Hono<AppEnv>().get(
  "/:guid/cards/summary",
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

        const all = await loadCardStats(tx, collection.id, sql`TRUE`);
        const filtered = await loadCardStats(
          tx,
          collection.id,
          cardFilterSql(query),
        );
        return { success: true, data: { all, filtered } };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
