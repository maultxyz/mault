import { queryOptions } from "@tanstack/react-query";
import type { AdminUserSummary, ImpersonationAuditEntry, Result } from "@magic-vault/shared";
import { apiGet, unwrapOr } from "@/lib/api/client";
import { ADMIN_USERS_SEARCH_STALE_MS } from "@/lib/constants/admin-users";

export function adminUsersSearchQueryOptions(search: string, isSearchReady: boolean) {
  return queryOptions({
    queryKey: ["admin", "users", "search", search] as const,
    queryFn: () =>
      unwrapOr(
        apiGet<Result<AdminUserSummary[]>>(`/api/admin/users?${new URLSearchParams({ search })}`),
        [] as AdminUserSummary[],
      ),
    enabled: isSearchReady,
    staleTime: ADMIN_USERS_SEARCH_STALE_MS,
  });
}

export const impersonationAuditQueryOptions = queryOptions({
  queryKey: ["admin", "users", "impersonation-audit"] as const,
  queryFn: () =>
    unwrapOr(apiGet<Result<ImpersonationAuditEntry[]>>("/api/admin/impersonation-audit"), [] as ImpersonationAuditEntry[]),
});
