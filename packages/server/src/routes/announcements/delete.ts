import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { invalidatePublicAnnouncements } from "../../lib/public-announcements";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const deleteAnnouncementRoute = new Hono<AppEnv>().delete(
  "/:guid",
  requireAuth,
  requireRole(...PLATFORM_STAFF_ROLES),
  async (c) => {
    const guid = c.req.param("guid");
    try {
      const target = await db.query.announcements.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.isDeleted, false)),
        columns: { id: true },
      });
      if (!target)
        return c.json({ success: false, message: "Announcement not found." }, 404);

      await db
        .update(announcements)
        .set({ isDeleted: true })
        .where(eq(announcements.id, target.id));
      invalidatePublicAnnouncements();
      return c.json({ success: true, data: null });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
