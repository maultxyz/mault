import type { Announcement, AnnouncementSeverity } from "@magic-vault/shared";
import type { announcements } from "../../db/schema";

export function toAnnouncement(row: typeof announcements.$inferSelect): Announcement {
  return {
    guid: row.guid!,
    severity: row.severity as AnnouncementSeverity,
    message: row.message,
    isActive: row.isActive,
    showOnLanding: row.showOnLanding,
    link: row.link ?? null,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface AnnouncementInput {
  severity: AnnouncementSeverity;
  message: string;
  isActive?: boolean;
  showOnLanding?: boolean;
  link?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export function parseAnnouncementLink(
  link: string | null | undefined,
): { ok: true; value: string | null } | { ok: false } {
  if (!link?.trim()) return { ok: true, value: null };
  try {
    const url = new URL(link.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false };
  }
}
