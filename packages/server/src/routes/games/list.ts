import { Hono } from "hono";
import { db } from "../../db";
import { games } from "../../db/schema";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { toGame } from "./shared";

// GET /games — any authenticated user (needed to pick a game per collection)
export const listGamesRoute = new Hono<AppEnv>().get("/", requireAuth, async (c) => {
  try {
    const rows = await db.select().from(games).orderBy(games.name);
    return c.json({ success: true, data: rows.map(toGame) });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});
