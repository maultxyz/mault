import { SORT_TEST_MAX_SAMPLE_SIZE } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { RANDOM_SAMPLE_CANDIDATE_MULTIPLIER } from "../../lib/constants/card-search";
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
    const exclusionFilter = matchingExclusionFilter({
      gameKey,
      lang,
      matchAllLanguages: false,
    });
    const sampledRows = await db.execute(sql`
      WITH candidates AS (
        SELECT card_id FROM ${cardImageVectors}
        WHERE game_key = ${gameKey} AND lang = ${lang}
        ORDER BY random()
        LIMIT ${count * RANDOM_SAMPLE_CANDIDATE_MULTIPLIER}
      )
      SELECT cards.card_id FROM candidates
      JOIN ${cardImageVectors} cards
        ON cards.game_key = ${gameKey} AND cards.lang = ${lang}
        AND cards.card_id = candidates.card_id
      WHERE cards.data IS NOT NULL ${exclusionFilter}
      LIMIT ${count}
    `);
    const rows =
      sampledRows.rows.length >= count
        ? sampledRows
        : await db.execute(sql`
            SELECT card_id FROM ${cardImageVectors}
            WHERE game_key = ${gameKey} AND lang = ${lang} AND data IS NOT NULL
              ${exclusionFilter}
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
