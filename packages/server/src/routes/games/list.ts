import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { games } from "../../db/schema";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { toGame } from "./shared";

export const listGamesRoute = new Hono<AppEnv>().get("/", requireAuth, async (c) => {
  const rows = await db
    .select()
    .from(games)
    .where(eq(games.isDeleted, false))
    .orderBy(games.name);
  return c.json({ success: true, data: rows.map(toGame) });
});
