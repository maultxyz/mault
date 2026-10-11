import { IconAlertTriangle, IconInfoCircle, type Icon } from "@tabler/icons-react";
import type { AnnouncementSeverity } from "@magic-vault/shared";

export const ANNOUNCEMENT_SEVERITIES: AnnouncementSeverity[] = [
  "info",
  "warning",
  "danger",
];

export const ANNOUNCEMENT_SEVERITY_ICONS: Record<AnnouncementSeverity, Icon> = {
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  danger: IconAlertTriangle,
};
