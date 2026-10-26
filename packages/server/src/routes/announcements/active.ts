import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { toAnnouncement } from "./shared";

export const activeAnnouncementsRoute = new Hono<AppEnv>().get(
  "/active",
  requireAuth,
  async (c) => {
    const now = new Date();
    const rows = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          eq(announcements.isDeleted, false),
          or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
          or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
        ),
      )
      .orderBy(announcements.createdAt);
    return c.json({ success: true, data: rows.map(toAnnouncement) });
  },
);
