import {
  activeAnnouncementsQueryOptions,
  publicAnnouncementsQueryOptions,
} from "@/features/announcements/api/announcements";
import { ANNOUNCEMENT_SEVERITY_ICONS } from "@/lib/constants/announcements";
import type { AppAlert } from "@/lib/interfaces/alerts";
import type { Announcement } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";

function toAnnouncementAlerts(announcements: Announcement[] | undefined): AppAlert[] {
  return (announcements ?? []).map((announcement) => ({
    id: `announcement-${announcement.guid}`,
    severity: announcement.severity,
    icon: ANNOUNCEMENT_SEVERITY_ICONS[announcement.severity],
    message: announcement.message,
    link: announcement.link,
  }));
}

export function useAnnouncementAlerts(): AppAlert[] {
  const { data } = useQuery(activeAnnouncementsQueryOptions);
  return toAnnouncementAlerts(data);
}

export function usePublicAnnouncementAlerts(): AppAlert[] {
  const { data } = useQuery(publicAnnouncementsQueryOptions);
  return toAnnouncementAlerts(data);
}
