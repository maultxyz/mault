import { Hono } from "hono";
import { db } from "../../db";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { syncOneCard } from "./shared";

export const cardsRevectorizeRoute = new Hono<AppEnv>().post(
  "/cards/:cardId/revectorize",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const cardId = c.req.param("cardId");

    // The same card id can exist in multiple games and languages, so
    // re-vectorize every copy.
    const existing = await db.query.cardImageVectors.findMany({
      where: (t, { eq }) => eq(t.cardId, cardId),
      columns: { gameKey: true, lang: true },
    });
    if (existing.length === 0) {
      return c.json(
        {
          success: false,
          message: `Card ${cardId} not found in database.`,
        },
        404,
      );
    }

    let message = "";
    for (const row of existing) {
      const result = await syncOneCard(row.gameKey, cardId, row.lang);
      if (!result.success) {
        return c.json(
          { success: false, message: result.message },
          result.status,
        );
      }
      message = result.message.replace("Synced:", "Re-vectorized:");
    }
    return c.json({ success: true, message });
  },
);
