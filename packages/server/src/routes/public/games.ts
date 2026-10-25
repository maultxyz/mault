import { Hono } from "hono";
import { PUBLIC_GAMES_MAX_AGE_MS } from "../../lib/constants/timing";
import { publicGamesCache } from "../../lib/public-games";
import type { AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

// GET /public/games — unauthenticated, for the marketing/landing page.
export const publicGamesRoute = new Hono<AppEnv>().get("/games", async (c) => {
  try {
    const data = await publicGamesCache.get(PUBLIC_GAMES_MAX_AGE_MS);
    return c.json({ success: true, data });
  } catch (err) {
    return databaseErrorResponse(c, err);
  }
});
