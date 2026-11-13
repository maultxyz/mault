import { apiGet, apiPost } from "@/lib/api/client";
import { SHARE_LINKS_QUERY_KEY } from "@/lib/constants/share-links";
import type { OrgShareLink, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const shareLinksQueryOptions = (
  orgId: string | undefined,
  subjectGuid: string,
) =>
  queryOptions({
    queryKey: [...SHARE_LINKS_QUERY_KEY, orgId, subjectGuid] as const,
    queryFn: () =>
      apiGet<Result<OrgShareLink[]>>(
        `/api/share-links?${new URLSearchParams({ subjectGuid })}`,
      ).then((result) => result.data ?? []),
    enabled: !!orgId,
  });

export function revokeShareLink(guid: string): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/share-links/${guid}/revoke`);
}
