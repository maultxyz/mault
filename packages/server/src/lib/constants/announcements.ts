import type { AnnouncementSeverity } from "@magic-vault/shared";

export const ANNOUNCEMENT_SEVERITIES: AnnouncementSeverity[] = [
  "info",
  "warning",
  "danger",
];

export const DEPLOY_ANNOUNCEMENT_DEFAULT_MESSAGE =
  "Mault is being updated. You may see brief interruptions for the next few minutes.";
export const DEPLOY_ANNOUNCEMENT_DEFAULT_SEVERITY: AnnouncementSeverity = "warning";
export const DEPLOY_ANNOUNCEMENT_DEFAULT_MINUTES = 60;
export const DEPLOY_ANNOUNCEMENT_MAX_MINUTES = 24 * 60;
