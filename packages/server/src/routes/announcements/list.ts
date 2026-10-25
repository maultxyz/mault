import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { toAnnouncement } from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const listAnnouncementsRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireRole(...PLATFORM_STAFF_ROLES),
  async (c) => {
    try {
      const rows = await db
        .select()
        .from(announcements)
        .where(eq(announcements.isDeleted, false))
        .orderBy(announcements.createdAt);
      return c.json({ success: true, data: rows.map(toAnnouncement) });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
