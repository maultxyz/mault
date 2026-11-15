import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { CUSTOM_SHORT_LINKS_QUERY_KEY } from "@/lib/constants/admin";
import type {
  CustomShortLink,
  CustomShortLinkFormValues,
  CustomShortLinkResult,
  CustomShortLinksOverview,
  CustomShortLinkUpdateValues,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const customShortLinksQueryOptions = queryOptions({
  queryKey: CUSTOM_SHORT_LINKS_QUERY_KEY,
  queryFn: async () => {
    const result = await apiGet<Result<CustomShortLinksOverview>>("/api/admin/short-links");
    if (!result.success || !result.data) throw new Error(result.message);
    return result.data;
  },
});

export function createCustomShortLink(
  input: CustomShortLinkFormValues,
): Promise<CustomShortLinkResult<CustomShortLink>> {
  return apiPost<CustomShortLinkResult<CustomShortLink>>("/api/admin/short-links", input);
}

export function updateCustomShortLink(
  code: string,
  input: CustomShortLinkUpdateValues,
): Promise<CustomShortLinkResult<CustomShortLink>> {
  return apiPut<CustomShortLinkResult<CustomShortLink>>(
    `/api/admin/short-links/${encodeURIComponent(code)}`,
    input,
  );
}

export function deleteCustomShortLink(code: string): Promise<CustomShortLinkResult<null>> {
  return apiDelete<CustomShortLinkResult<null>>(
    `/api/admin/short-links/${encodeURIComponent(code)}`,
  );
}
