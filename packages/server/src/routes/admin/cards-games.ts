import { count } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const cardsGamesRoute = new Hono<AppEnv>().get(
  "/cards/games",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const rows = await db
      .select({ gameKey: cardImageVectors.gameKey, count: count() })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey)
      .orderBy(cardImageVectors.gameKey);

    return c.json({ success: true, data: rows });
  },
);
