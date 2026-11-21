import { queryOptions } from "@tanstack/react-query";
import type { CreatedOrgApiKey, OrgApiKeyInput, OrgApiKeyList, Result } from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, unwrap } from "@/lib/api/client";

export const apiKeysQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["api-keys", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<OrgApiKeyList>>("/api/api-keys")),
    enabled: !!orgId,
  });

export function createApiKey(input: OrgApiKeyInput): Promise<CreatedOrgApiKey> {
  return unwrap(apiPost<Result<CreatedOrgApiKey>>("/api/api-keys", input));
}

export async function revokeApiKey(guid: string): Promise<void> {
  const result = await apiDelete<Result<null>>(`/api/api-keys/${guid}`);
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}
