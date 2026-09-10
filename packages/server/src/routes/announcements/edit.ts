import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { ANNOUNCEMENT_SEVERITIES as SEVERITIES } from "../../lib/constants/announcements";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { type AnnouncementInput, toAnnouncement } from "./shared";

export const editAnnouncementRoute = new Hono<AppEnv>().put(
  "/:guid",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const guid = c.req.param("guid");
    const { severity, message, isActive, startsAt, endsAt } =
      await c.req.json<Partial<AnnouncementInput>>();

    if (severity !== undefined && !SEVERITIES.includes(severity)) {
      return c.json({ success: false, message: "Invalid severity." }, 400);
    }

    const startsAtDate =
      startsAt !== undefined ? (startsAt ? new Date(startsAt) : null) : undefined;
    const endsAtDate =
      endsAt !== undefined ? (endsAt ? new Date(endsAt) : null) : undefined;
    if (startsAtDate && Number.isNaN(startsAtDate.getTime())) {
      return c.json({ success: false, message: "Invalid start time." }, 400);
    }
    if (endsAtDate && Number.isNaN(endsAtDate.getTime())) {
      return c.json({ success: false, message: "Invalid end time." }, 400);
    }
    if (startsAtDate && endsAtDate && endsAtDate <= startsAtDate) {
      return c.json(
        { success: false, message: "End time must be after start time." },
        400,
      );
    }

    try {
      const target = await db.query.announcements.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
        columns: { id: true },
      });
      if (!target)
        return c.json({ success: false, message: "Announcement not found." }, 404);

      const updates: Partial<typeof announcements.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (severity !== undefined) updates.severity = severity;
      if (message !== undefined) updates.message = message.trim();
      if (isActive !== undefined) updates.isActive = isActive;
      if (startsAtDate !== undefined) updates.startsAt = startsAtDate;
      if (endsAtDate !== undefined) updates.endsAt = endsAtDate;

      const [row] = await db
        .update(announcements)
        .set(updates)
        .where(eq(announcements.id, target.id))
        .returning();
      return c.json({ success: true, data: toAnnouncement(row) });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
