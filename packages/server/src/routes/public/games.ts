import { Hono } from "hono";
import { PUBLIC_GAMES_MAX_AGE_MS } from "../../lib/constants/timing";
import { publicGamesCache } from "../../lib/public-games";
import type { AppEnv } from "../../middleware/auth";

export const publicGamesRoute = new Hono<AppEnv>().get("/games", async (c) => {
  const data = await publicGamesCache.get(PUBLIC_GAMES_MAX_AGE_MS);
  return c.json({ success: true, data });
});
