import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { OrgShareLink, Result } from "@magic-vault/shared";
import { buildMonitorLinkUrl } from "@/features/collections/api/collection-cards";
import { buildStorageShareLinkUrl } from "@/features/storage/api/storage-share-links";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import { SHARE_LINK_SUBJECT_GUID_PARAM, SHARE_LINKS_QUERY_KEY } from "@/lib/constants/share-links";

export const shareLinksQueryOptions = (orgId: string | null, subjectGuid: string | null) =>
  queryOptions({
    queryKey: [SHARE_LINKS_QUERY_KEY, orgId, subjectGuid] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<OrgShareLink[]>>(
          `/api/share-links?${SHARE_LINK_SUBJECT_GUID_PARAM}=${encodeURIComponent(subjectGuid ?? "")}`,
        ),
      ),
    enabled: !!orgId && !!subjectGuid,
  });

export function revokeShareLink(linkGuid: string): Promise<unknown> {
  return unwrap(apiPost<Result<unknown>>(`/api/share-links/${linkGuid}/revoke`));
}

export function invalidateShareLinks(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: [SHARE_LINKS_QUERY_KEY] });
}

export function orgShareLinkUrl(link: OrgShareLink): string {
  return link.kind === "storage"
    ? buildStorageShareLinkUrl(link.subjectGuid, link.token)
    : buildMonitorLinkUrl(link.subjectGuid, link.token);
}
