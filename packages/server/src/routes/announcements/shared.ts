import type { Announcement, AnnouncementSeverity } from "@magic-vault/shared";
import type { announcements } from "../../db/schema";

export const SEVERITIES: AnnouncementSeverity[] = ["info", "warning", "danger"];

export function toAnnouncement(row: typeof announcements.$inferSelect): Announcement {
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

export interface AnnouncementInput {
  severity: AnnouncementSeverity;
  message: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}
