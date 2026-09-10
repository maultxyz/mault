import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { toAnnouncement } from "./shared";

// GET /announcements/active — any authenticated user, powers the alert tray
export const activeAnnouncementsRoute = new Hono<AppEnv>().get(
  "/active",
  requireAuth,
  async (c) => {
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(announcements)
        .where(
          and(
            eq(announcements.isActive, true),
            or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
            or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
          ),
        )
        .orderBy(announcements.createdAt);
      return c.json({ success: true, data: rows.map(toAnnouncement) });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
