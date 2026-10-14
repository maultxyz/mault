import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { announcements } from "../db/schema";
import { createCachedValue } from "./cached-value";
import { PUBLIC_ANNOUNCEMENTS_MAX_AGE_MS } from "./constants/timing";

const landingAnnouncementsCache = createCachedValue(() =>
  db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        eq(announcements.isDeleted, false),
        eq(announcements.showOnLanding, true),
      ),
    )
    .orderBy(announcements.createdAt),
);

export async function getPublicAnnouncements(): Promise<
  (typeof announcements.$inferSelect)[]
> {
  const rows = await landingAnnouncementsCache.get(
    PUBLIC_ANNOUNCEMENTS_MAX_AGE_MS,
  );
  const now = Date.now();
  return rows.filter(
    (row) =>
      (!row.startsAt || row.startsAt.getTime() <= now) &&
      (!row.endsAt || row.endsAt.getTime() >= now),
  );
}

export function invalidatePublicAnnouncements(): void {
  landingAnnouncementsCache.invalidate();
}
