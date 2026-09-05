import { activeAnnouncementsQueryOptions } from "@/features/announcements/api/announcements";
import type { AppAlert } from "@/lib/alerts";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

const ICONS = {
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  danger: IconAlertTriangle,
};

// Admin-authored announcements (features/announcements) - the only alert
// source backed by the database rather than client-side state, and the only
// one that can produce more than one alert at a time.
export function useAnnouncementAlerts(): AppAlert[] {
  const { data } = useQuery(activeAnnouncementsQueryOptions);

  return (data ?? []).map((announcement) => ({
    id: `announcement-${announcement.guid}`,
    severity: announcement.severity,
    icon: ICONS[announcement.severity],
    message: announcement.message,
  }));
}
