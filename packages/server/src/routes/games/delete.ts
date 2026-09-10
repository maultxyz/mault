import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { games } from "../../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const deleteGameRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const guid = c.req.param("guid");
    try {
      const target = await db.query.games.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!target)
        return c.json({ success: false, message: "Game not found." }, 404);

      await db.delete(games).where(eq(games.id, target.id));
      return c.json({ success: true, data: null });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
