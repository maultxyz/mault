import { Hono } from "hono";
import { listLiveGames } from "../../lib/games-list";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const listGamesRoute = new Hono<AppEnv>().get("/", requireAuth, async (c) => {
  return c.json({ success: true, data: await listLiveGames() });
});
