import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { Announcement, AnnouncementSeverity, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export interface AnnouncementInput {
  severity: AnnouncementSeverity;
  message: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export async function listActiveAnnouncements(): Promise<Result<Announcement[]>> {
  return apiGet<Result<Announcement[]>>("/api/announcements/active");
}

export const activeAnnouncementsQueryOptions = queryOptions({
  queryKey: ["announcements", "active"] as const,
  queryFn: () => listActiveAnnouncements().then((r) => r.data ?? []),
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
});

export async function listAnnouncements(): Promise<Result<Announcement[]>> {
  return apiGet<Result<Announcement[]>>("/api/announcements");
}

export const announcementsQueryOptions = queryOptions({
  queryKey: ["announcements", "all"] as const,
  queryFn: () => listAnnouncements().then((r) => r.data ?? []),
});

export async function createAnnouncement(
  input: AnnouncementInput,
): Promise<Result<Announcement>> {
  return apiPost<Result<Announcement>>("/api/announcements", input);
}

export async function updateAnnouncement(
  guid: string,
  input: Partial<AnnouncementInput>,
): Promise<Result<Announcement>> {
  return apiPut<Result<Announcement>>(`/api/announcements/${guid}`, input);
}

export async function deleteAnnouncement(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/announcements/${guid}`);
}
