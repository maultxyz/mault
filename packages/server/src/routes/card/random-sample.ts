import { SORT_TEST_MAX_SAMPLE_SIZE } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { resolveCardSearchForGame } from "../../lib/card-search/resolve";
import { searchCardsByIds } from "../../lib/card-search/stored-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { matchingExclusionFilter } from "./shared";

export const randomSampleCardsRoute = new Hono<AppEnv>().get(
  "/random-sample",
  requireAuth,
  requireOrg,
  async (c) => {
    const gameKey = c.req.query("gameKey") ?? "";
    const lang = c.req.query("lang") || "en";
    const resolved = resolveCardSearchForGame(gameKey, lang);
    if (!resolved) {
      return c.json({ success: false, message: "Unknown game." }, 400);
    }
    const requested = Number.parseInt(c.req.query("count") ?? "", 10);
    if (!Number.isInteger(requested) || requested < 1) {
      return c.json({ success: false, message: "Invalid count." }, 400);
    }
    const count = Math.min(requested, SORT_TEST_MAX_SAMPLE_SIZE);
    const rows = await db.execute(sql`
      SELECT card_id FROM ${cardImageVectors}
      WHERE game_key = ${gameKey} AND lang = ${lang} AND data IS NOT NULL
        ${matchingExclusionFilter({ gameKey, lang, matchAllLanguages: false })}
      ORDER BY random()
      LIMIT ${count}
    `);
    const cardIds = (rows.rows as { card_id: string }[]).map((row) => row.card_id);
    const cardsById = await searchCardsByIds(resolved, cardIds);
    return c.json({
      success: true,
      message: "Loaded random cards.",
      data: cardIds.flatMap((cardId) => {
        const card = cardsById.get(cardId);
        return card ? [card] : [];
      }),
    });
  },
);
