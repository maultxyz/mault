import { Hono } from "hono";
import { getPublicAnnouncements } from "../../lib/public-announcements";
import type { AppEnv } from "../../middleware/auth";
import { toAnnouncement } from "./shared";

export const publicAnnouncementsRoute = new Hono<AppEnv>().get(
  "/public",
  async (c) => {
    const rows = await getPublicAnnouncements();
    return c.json({ success: true, data: rows.map(toAnnouncement) });
  },
);
