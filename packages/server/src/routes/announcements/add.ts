import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { ANNOUNCEMENT_SEVERITIES as SEVERITIES } from "../../lib/constants/announcements";
import { invalidatePublicAnnouncements } from "../../lib/public-announcements";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { parseAnnouncementLink, toAnnouncement } from "./shared";
import type { AnnouncementInput } from "@magic-vault/shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const addAnnouncementRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireRole(...PLATFORM_STAFF_ROLES),
  async (c) => {
    const { severity, message, isActive, showOnLanding, link, startsAt, endsAt } =
      await c.req.json<AnnouncementInput>();

    if (!message?.trim()) {
      return c.json({ success: false, message: "message is required." }, 400);
    }
    if (!SEVERITIES.includes(severity)) {
      return c.json({ success: false, message: "Invalid severity." }, 400);
    }

    const parsedLink = parseAnnouncementLink(link);
    if (!parsedLink.ok) {
      return c.json({ success: false, message: "Invalid link URL." }, 400);
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
          showOnLanding: showOnLanding ?? false,
          link: parsedLink.value,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
        })
        .returning();
      invalidatePublicAnnouncements();
      return c.json({ success: true, data: toAnnouncement(row) });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
