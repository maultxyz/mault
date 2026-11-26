import { queryOptions } from "@tanstack/react-query";
import type { OrgProfileInput, OrgProfileSaveResult, OrgProfileSettings, Result } from "@magic-vault/shared";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";
import { ORG_PROFILE_API_PATH, ORG_PROFILE_QUERY_KEY } from "@/lib/constants/org-profile";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const orgProfileQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: [ORG_PROFILE_QUERY_KEY, orgId] as const,
    queryFn: () => unwrap(apiGet<Result<OrgProfileSettings>>(ORG_PROFILE_API_PATH)),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export function saveOrgProfile(input: OrgProfileInput): Promise<OrgProfileSaveResult> {
  return apiPut<OrgProfileSaveResult>(ORG_PROFILE_API_PATH, input);
}
