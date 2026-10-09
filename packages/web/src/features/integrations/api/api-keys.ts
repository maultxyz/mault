import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import type {
  CreatedOrgApiKey,
  OrgApiKeyInput,
  OrgApiKeyList,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const orgApiKeysQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["org-api-keys", orgId] as const,
    queryFn: () =>
      apiGet<Result<OrgApiKeyList>>("/api/api-keys").then(
        (r) => r.data ?? { keys: [], canManage: false },
      ),
    enabled: !!orgId,
  });

export function createOrgApiKey(
  input: OrgApiKeyInput,
): Promise<Result<CreatedOrgApiKey>> {
  return apiPost<Result<CreatedOrgApiKey>>("/api/api-keys", input);
}

export function revokeOrgApiKey(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/api-keys/${guid}`);
}
