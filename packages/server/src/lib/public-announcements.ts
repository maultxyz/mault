import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { announcements } from "../db/schema";
import { createCachedValue } from "./cached-value";
import { ANNOUNCEMENTS_CACHE_MAX_AGE_MS } from "./constants/timing";

type AnnouncementRow = typeof announcements.$inferSelect;

const liveAnnouncementsCache = createCachedValue(() =>
  db
    .select()
    .from(announcements)
    .where(
      and(eq(announcements.isActive, true), eq(announcements.isDeleted, false)),
    )
    .orderBy(announcements.createdAt),
);

function isWithinSchedule(row: AnnouncementRow, now: number): boolean {
  return (
    (!row.startsAt || row.startsAt.getTime() <= now) &&
    (!row.endsAt || row.endsAt.getTime() >= now)
  );
}

export async function getActiveAnnouncements(): Promise<AnnouncementRow[]> {
  const rows = await liveAnnouncementsCache.get(ANNOUNCEMENTS_CACHE_MAX_AGE_MS);
  const now = Date.now();
  return rows.filter((row) => isWithinSchedule(row, now));
}

export async function getPublicAnnouncements(): Promise<AnnouncementRow[]> {
  const rows = await getActiveAnnouncements();
  return rows.filter((row) => row.showOnLanding);
}

export function invalidateAnnouncementsCache(): void {
  liveAnnouncementsCache.invalidate();
}
