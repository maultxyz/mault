import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { toAnnouncement } from "./shared";

// GET /announcements — admin only, includes inactive ones for management
export const listAnnouncementsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    try {
      const rows = await db
        .select()
        .from(announcements)
        .orderBy(announcements.createdAt);
      return c.json({ success: true, data: rows.map(toAnnouncement) });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
