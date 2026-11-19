import { apiGet, apiPost } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import { SHARED_CARD_LINKS_QUERY_KEY } from "@/lib/constants/share-links";
import type {
  CardShareLink,
  CardShareLinkInfo,
  Result,
  SharedCardLink,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export function createCardShareLink(scanId: string): Promise<Result<CardShareLink>> {
  return apiPost<Result<CardShareLink>>(`/api/share-links/cards/${scanId}`);
}

export const sharedCardLinksQueryOptions = (
  orgId: string | undefined,
  collectionGuid: string,
) =>
  queryOptions({
    queryKey: [...SHARED_CARD_LINKS_QUERY_KEY, orgId, collectionGuid] as const,
    queryFn: async () => {
      const params = new URLSearchParams({ collectionGuid });
      const result = await apiGet<Result<SharedCardLink[]>>(`/api/share-links/cards?${params}`);
      if (!result.success || !result.data) throw new Error(result.message);
      return result.data;
    },
    enabled: !!orgId,
  });

export async function verifyCardShareLink(token: string): Promise<Result<CardShareLinkInfo>> {
  const params = new URLSearchParams({ token });
  const response = await fetch(`${API_BASE}/api/public/card-share-link?${params}`);
  return response.json();
}
