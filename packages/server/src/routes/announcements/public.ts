import { Hono } from "hono";
import { getPublicAnnouncements } from "../../lib/public-announcements";
import type { AppEnv } from "../../middleware/auth";
import { toAnnouncement } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const publicAnnouncementsRoute = new Hono<AppEnv>().get(
  "/public",
  async (c) => {
    try {
      const rows = await getPublicAnnouncements();
      return c.json({ success: true, data: rows.map(toAnnouncement) });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
