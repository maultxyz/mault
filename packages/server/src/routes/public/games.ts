import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors, games } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";

// GET /public/games — unauthenticated, for the marketing/landing page.
export const publicGamesRoute = new Hono<AppEnv>().get("/games", async (c) => {
  try {
    const rows = await db
      .select({ key: games.key, name: games.name })
      .from(games)
      .where(eq(games.isActive, true))
      .orderBy(games.name);

    const countRows = await db
      .select({ gameKey: cardImageVectors.gameKey, count: count() })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey);
    const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));

    const langRows = await db
      .select({
        gameKey: cardImageVectors.gameKey,
        lang: cardImageVectors.lang,
      })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey, cardImageVectors.lang);
    const langsByKey = new Map<string, string[]>();
    for (const row of langRows) {
      const list = langsByKey.get(row.gameKey) ?? [];
      list.push(row.lang);
      langsByKey.set(row.gameKey, list);
    }

    const data = rows.map((row) => ({
      ...row,
      cardCount: countByKey.get(row.key) ?? 0,
      languages: (langsByKey.get(row.key) ?? []).sort(),
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});
