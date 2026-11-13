import { queryOptions } from "@tanstack/react-query";
import type { Announcement, AnnouncementInput, Result } from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, unwrap, unwrapOr } from "@/lib/api/client";
import { ADMIN_DISCORD_ANNOUNCEMENTS_QUERY_KEY } from "@/lib/constants/admin-discord";

export const adminAnnouncementsQueryOptions = queryOptions({
  queryKey: ADMIN_DISCORD_ANNOUNCEMENTS_QUERY_KEY,
  queryFn: () => unwrapOr(apiGet<Result<Announcement[]>>("/api/announcements"), []),
});

export function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  return unwrap(apiPost<Result<Announcement>>("/api/announcements", input));
}

export function updateAnnouncement(guid: string, input: AnnouncementInput): Promise<Announcement> {
  return unwrap(apiPut<Result<Announcement>>(`/api/announcements/${guid}`, input));
}

export async function deleteAnnouncement(guid: string): Promise<void> {
  const result = await apiDelete<Result<null>>(`/api/announcements/${guid}`);
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}
