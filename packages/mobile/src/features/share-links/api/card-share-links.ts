import { queryOptions } from "@tanstack/react-query";
import type { CardShareLink, Result, SharedCardLink } from "@magic-vault/shared";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import { SHARE_LINKS_QUERY_KEY, SHARED_CARD_LINKS_QUERY_SEGMENT } from "@/lib/constants/share-links";

export function createCardShareLink(scanId: string): Promise<CardShareLink> {
  return unwrap(apiPost<Result<CardShareLink>>(`/api/share-links/cards/${scanId}`));
}

export const sharedCardLinksQueryOptions = (orgId: string | null, collectionGuid: string) =>
  queryOptions({
    queryKey: [SHARE_LINKS_QUERY_KEY, SHARED_CARD_LINKS_QUERY_SEGMENT, orgId, collectionGuid] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<SharedCardLink[]>>(
          `/api/share-links/cards?${new URLSearchParams({ collectionGuid })}`,
        ),
      ),
    enabled: !!orgId && !!collectionGuid,
  });
