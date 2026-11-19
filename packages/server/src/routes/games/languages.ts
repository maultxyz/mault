import { Hono } from "hono";
import { db } from "../../db";
import { languagesOfGame } from "../../lib/card-match-index";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const gameLanguagesRoute = new Hono<AppEnv>().get(
  "/:guid/languages",
  requireAuth,
  async (c) => {
    const guid = c.req.param("guid");
    const game = await db.query.games.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.guid, guid), eq(t.isDeleted, false)),
      columns: { key: true },
    });
    if (!game)
      return c.json({ success: false, message: "Game not found." }, 404);

    return c.json({ success: true, data: await languagesOfGame(game.key) });
  },
);
