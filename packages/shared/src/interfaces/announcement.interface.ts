export type AnnouncementSeverity = "info" | "warning" | "danger";

export interface Announcement {
  guid: string;
  severity: AnnouncementSeverity;
  message: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
