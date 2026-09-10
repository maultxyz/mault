import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { ANNOUNCEMENT_SEVERITIES as SEVERITIES } from "../../lib/constants/announcements";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { type AnnouncementInput, toAnnouncement } from "./shared";

export const addAnnouncementRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const { severity, message, isActive, startsAt, endsAt } =
      await c.req.json<AnnouncementInput>();

    if (!message?.trim()) {
      return c.json({ success: false, message: "message is required." }, 400);
    }
    if (!SEVERITIES.includes(severity)) {
      return c.json({ success: false, message: "Invalid severity." }, 400);
    }

    const startsAtDate = startsAt ? new Date(startsAt) : null;
    const endsAtDate = endsAt ? new Date(endsAt) : null;
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
      const [row] = await db
        .insert(announcements)
        .values({
          severity,
          message: message.trim(),
          isActive: isActive ?? true,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
        })
        .returning();
      return c.json({ success: true, data: toAnnouncement(row) });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
