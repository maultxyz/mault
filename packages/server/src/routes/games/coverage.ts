import type { GameCoverage } from "@magic-vault/shared";
import { count, max } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors, games } from "../../db/schema";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const gameCoverageRoute = new Hono<AppEnv>().get("/coverage", requireAuth, async (c) => {
  try {
    const gameRows = await db.select().from(games).orderBy(games.name);

    const countRows = await db
      .select({
        gameKey: cardImageVectors.gameKey,
        count: count(),
        lastUpdated: max(cardImageVectors.updatedAt),
      })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey);
    const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));
    const lastUpdatedByKey = new Map(
      countRows.map((r) => [r.gameKey, r.lastUpdated]),
    );

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

    const data: GameCoverage[] = gameRows.map((row) => ({
      guid: row.guid!,
      key: row.key,
      name: row.name,
      isActive: row.isActive,
      cardCount: countByKey.get(row.key) ?? 0,
      languages: (langsByKey.get(row.key) ?? []).sort(),
      lastUpdated: lastUpdatedByKey.get(row.key)?.toISOString() ?? null,
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});
