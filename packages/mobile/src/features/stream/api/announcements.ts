import { queryOptions } from "@tanstack/react-query";
import type { Announcement, Result } from "@magic-vault/shared";
import { apiGet } from "@/lib/api/client";
import { ANNOUNCEMENTS_REFETCH_MS, ANNOUNCEMENTS_STALE_MS } from "@/lib/constants/stream";

export const activeAnnouncementsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["announcements", "active", orgId] as const,
    queryFn: () => apiGet<Result<Announcement[]>>("/api/announcements/active").then((r) => r.data ?? []),
    enabled: !!orgId,
    staleTime: ANNOUNCEMENTS_STALE_MS,
    refetchInterval: ANNOUNCEMENTS_REFETCH_MS,
  });
