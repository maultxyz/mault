import type { AnnouncementSeverity } from "@magic-vault/shared";

export interface AnnouncementInput {
  severity: AnnouncementSeverity;
  message: string;
  isActive: boolean;
  showOnLanding: boolean;
  link: string | null;
  startsAt: string | null;
  endsAt: string | null;
}
