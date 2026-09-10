import { Hono } from "hono";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { syncOneCard } from "./shared";

export const cardsSyncRoute = new Hono<AppEnv>().post(
  "/cards/sync",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    let gameKey: string | undefined;
    let cardId: string | undefined;
    let lang = "en";
    try {
      const body = await c.req.json<{
        gameKey?: string;
        cardId?: string;
        lang?: string;
      }>();
      gameKey = body.gameKey;
      cardId = body.cardId?.trim();
      if (body.lang) lang = body.lang;
    } catch {}

    if (!gameKey || !cardId) {
      return c.json(
        { success: false, message: "gameKey and cardId are required." },
        400,
      );
    }

    const result = await syncOneCard(gameKey, cardId, lang);
    if (!result.success) {
      return c.json({ success: false, message: result.message }, result.status);
    }
    return c.json({ success: true, message: result.message });
  },
);
