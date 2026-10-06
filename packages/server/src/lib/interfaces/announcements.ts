import type { AnnouncementSeverity } from "@magic-vault/shared";

export interface DeployAnnouncementInput {
  message?: string;
  severity?: AnnouncementSeverity;
  showOnLanding?: boolean;
  link?: string | null;
  durationMinutes?: number;
}
