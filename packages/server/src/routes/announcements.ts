import type { Announcement, AnnouncementSeverity } from "@magic-vault/shared";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { announcements } from "../db/schema";
import { requireAuth, requireRole, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

const SEVERITIES: AnnouncementSeverity[] = ["info", "warning", "danger"];

function toAnnouncement(row: typeof announcements.$inferSelect): Announcement {
  return {
    guid: row.guid!,
    severity: row.severity as AnnouncementSeverity,
    message: row.message,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface AnnouncementInput {
  severity: AnnouncementSeverity;
  message: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

// GET /announcements/active — any authenticated user, powers the alert tray
router.get("/active", requireAuth, async (c) => {
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
});

// GET /announcements — admin only, includes inactive ones for management
router.get("/", requireAuth, requireRole("admin"), async (c) => {
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
});

router.post("/", requireAuth, requireRole("admin"), async (c) => {
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
});

router.put("/:guid", requireAuth, requireRole("admin"), async (c) => {
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
});

router.delete("/:guid", requireAuth, requireRole("admin"), async (c) => {
  const guid = c.req.param("guid");
  try {
    const target = await db.query.announcements.findFirst({
      where: (t, { eq }) => eq(t.guid, guid),
      columns: { id: true },
    });
    if (!target)
      return c.json({ success: false, message: "Announcement not found." }, 404);

    await db.delete(announcements).where(eq(announcements.id, target.id));
    return c.json({ success: true, data: null });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as announcementsRouter };
