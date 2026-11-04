import { Hono } from "hono";
import { getActiveAnnouncements } from "../../lib/public-announcements";
import { requireAuth, type AppEnv } from "../../middleware/auth";
import { toAnnouncement } from "./shared";

export const activeAnnouncementsRoute = new Hono<AppEnv>().get(
  "/active",
  requireAuth,
  async (c) => {
    const rows = await getActiveAnnouncements();
    return c.json({ success: true, data: rows.map(toAnnouncement) });
  },
);
