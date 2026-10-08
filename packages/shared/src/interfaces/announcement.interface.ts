export type AnnouncementSeverity = "info" | "warning" | "danger";

export interface DeployNotice {
  guid: string;
  message: string;
}

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

export interface AnnouncementInput {
  severity: AnnouncementSeverity;
  message: string;
  isActive?: boolean;
  showOnLanding?: boolean;
  link?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}
