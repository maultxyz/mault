import { queryOptions } from "@tanstack/react-query";
import type { Announcement, Result } from "@magic-vault/shared";
import { apiGet, unwrapOr } from "@/lib/api/client";
import { ANNOUNCEMENTS_REFETCH_MS, ANNOUNCEMENTS_STALE_MS } from "@/lib/constants/stream";

export const activeAnnouncementsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["announcements", "active", orgId] as const,
    queryFn: () => unwrapOr(apiGet<Result<Announcement[]>>("/api/announcements/active"), []),
    enabled: !!orgId,
    staleTime: ANNOUNCEMENTS_STALE_MS,
    refetchInterval: ANNOUNCEMENTS_REFETCH_MS,
  });
