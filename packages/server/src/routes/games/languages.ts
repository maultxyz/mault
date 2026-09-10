import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const gameLanguagesRoute = new Hono<AppEnv>().get(
  "/:guid/languages",
  requireAuth,
  async (c) => {
    const guid = c.req.param("guid");
    try {
      const game = await db.query.games.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { key: true },
      });
      if (!game)
        return c.json({ success: false, message: "Game not found." }, 404);

      const rows = await db
        .select({ lang: cardImageVectors.lang })
        .from(cardImageVectors)
        .where(eq(cardImageVectors.gameKey, game.key))
        .groupBy(cardImageVectors.lang)
        .orderBy(cardImageVectors.lang);

      return c.json({ success: true, data: rows?.map((r) => r.lang) ?? [] });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
