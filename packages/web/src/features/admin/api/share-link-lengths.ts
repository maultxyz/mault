import { apiGet, apiPut } from "@/lib/api/client";
import { SHARE_LINK_LENGTHS_QUERY_KEY } from "@/lib/constants/admin";
import type {
  AdminShareLinkLengthsResponse,
  Result,
  ShareLinkLengths,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const shareLinkLengthsQueryOptions = queryOptions({
  queryKey: SHARE_LINK_LENGTHS_QUERY_KEY,
  queryFn: () =>
    apiGet<Result<AdminShareLinkLengthsResponse>>("/api/admin/share-link-lengths").then(
      (r) => r.data ?? null,
    ),
});

export function saveShareLinkLengths(
  lengths: ShareLinkLengths,
): Promise<Result<AdminShareLinkLengthsResponse>> {
  return apiPut("/api/admin/share-link-lengths", lengths);
}
