import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { buildShareLinkUrl, type OrgShareLink, type Result, type ShareableLink } from "@magic-vault/shared";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import { WEB_URL } from "@/lib/constants/config";
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

export function orgShareLinkUrl(link: ShareableLink): string {
  return buildShareLinkUrl(WEB_URL, link);
}
