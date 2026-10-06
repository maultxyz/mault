import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import {
  ANNOUNCEMENT_SEVERITIES as SEVERITIES,
  DEPLOY_ANNOUNCEMENT_DEFAULT_MESSAGE,
  DEPLOY_ANNOUNCEMENT_DEFAULT_MINUTES,
  DEPLOY_ANNOUNCEMENT_DEFAULT_SEVERITY,
  DEPLOY_ANNOUNCEMENT_MAX_MINUTES,
} from "../../lib/constants/announcements";
import type { DeployAnnouncementInput } from "../../lib/interfaces/announcements";
import { requireDeployKey, type AppEnv } from "../../middleware/auth";
import { parseAnnouncementLink, toAnnouncement } from "./shared";

export const deployAnnouncementRoute = new Hono<AppEnv>()
  .post("/deploy", requireDeployKey, async (c) => {
    const body = await c.req
      .json<DeployAnnouncementInput>()
      .catch((): DeployAnnouncementInput => ({}));

    const severity = body.severity ?? DEPLOY_ANNOUNCEMENT_DEFAULT_SEVERITY;
    if (!SEVERITIES.includes(severity)) {
      return c.json({ success: false, message: "Invalid severity." }, 400);
    }

    const parsedLink = parseAnnouncementLink(body.link);
    if (!parsedLink.ok) {
      return c.json({ success: false, message: "Invalid link URL." }, 400);
    }

    const minutes = body.durationMinutes ?? DEPLOY_ANNOUNCEMENT_DEFAULT_MINUTES;
    if (
      !Number.isFinite(minutes) ||
      minutes <= 0 ||
      minutes > DEPLOY_ANNOUNCEMENT_MAX_MINUTES
    ) {
      return c.json({ success: false, message: "Invalid duration." }, 400);
    }

    try {
      const row = await db.transaction(async (tx) => {
        await tx.delete(announcements).where(eq(announcements.isDeploy, true));
        const [inserted] = await tx
          .insert(announcements)
          .values({
            severity,
            message: body.message?.trim() || DEPLOY_ANNOUNCEMENT_DEFAULT_MESSAGE,
            isActive: true,
            isDeploy: true,
            showOnLanding: body.showOnLanding ?? false,
            link: parsedLink.value,
            endsAt: new Date(Date.now() + minutes * 60_000),
          })
          .returning();
        return inserted;
      });
      return c.json({ success: true, data: toAnnouncement(row) });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  })
  .delete("/deploy", requireDeployKey, async (c) => {
    try {
      const removed = await db
        .delete(announcements)
        .where(eq(announcements.isDeploy, true))
        .returning({ id: announcements.id });
      return c.json({ success: true, data: { removed: removed.length } });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  });
