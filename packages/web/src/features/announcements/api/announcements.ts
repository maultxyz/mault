import { apiDelete, apiGet, apiPost, apiPut, publicGet } from "@/lib/api/client";
import type { AnnouncementInput } from "@/lib/interfaces/announcements";
import type { Announcement, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export type { AnnouncementInput };

export async function listActiveAnnouncements(): Promise<Result<Announcement[]>> {
  return apiGet<Result<Announcement[]>>("/api/announcements/active");
}

export const activeAnnouncementsQueryOptions = queryOptions({
  queryKey: ["announcements", "active"] as const,
  queryFn: () => listActiveAnnouncements().then((r) => r.data ?? []),
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
});

// No auth - powers the banner on the public landing/build pages.
export async function listPublicAnnouncements(): Promise<Result<Announcement[]>> {
  return publicGet<Result<Announcement[]>>("/api/announcements/public");
}

export const publicAnnouncementsQueryOptions = queryOptions({
  queryKey: ["announcements", "public"] as const,
  queryFn: () => listPublicAnnouncements().then((r) => r.data ?? []),
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
