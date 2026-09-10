import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";

export const deleteAnnouncementRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const guid = c.req.param("guid");
    try {
      const target = await db.query.announcements.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!target)
        return c.json({ success: false, message: "Announcement not found." }, 404);

      await db.delete(announcements).where(eq(announcements.id, target.id));
      return c.json({ success: true, data: null });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
