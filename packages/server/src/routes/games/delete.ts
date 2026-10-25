import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { games } from "../../db/schema";
import { publicGamesCache } from "../../lib/public-games";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const deleteGameRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireRole(...PLATFORM_STAFF_ROLES),
  async (c) => {
    const guid = c.req.param("guid");
    try {
      const target = await db.query.games.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.isDeleted, false)),
        columns: { id: true },
      });
      if (!target)
        return c.json({ success: false, message: "Game not found." }, 404);

      await db
        .update(games)
        .set({ isDeleted: true })
        .where(eq(games.id, target.id));
      publicGamesCache.invalidate();
      return c.json({ success: true, data: null });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
