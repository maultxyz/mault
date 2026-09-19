export type AnnouncementSeverity = "info" | "warning" | "danger";

export interface Announcement {
  guid: string;
  severity: AnnouncementSeverity;
  message: string;
  isActive: boolean;
  showOnLanding: boolean;
  link: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
