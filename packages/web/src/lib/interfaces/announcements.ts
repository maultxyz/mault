import type { AnnouncementSeverity } from "@magic-vault/shared";

export interface AnnouncementInput {
  severity: AnnouncementSeverity;
  message: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}
