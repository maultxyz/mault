import { activeAnnouncementsQueryOptions } from "@/features/announcements/api/announcements";
import type { AppAlert } from "@/lib/alerts";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

const ICONS = {
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  danger: IconAlertTriangle,
};

export function useAnnouncementAlerts(): AppAlert[] {
  const { data } = useQuery(activeAnnouncementsQueryOptions);

  return (data ?? []).map((announcement) => ({
    id: `announcement-${announcement.guid}`,
    severity: announcement.severity,
    icon: ICONS[announcement.severity],
    message: announcement.message,
  }));
}
