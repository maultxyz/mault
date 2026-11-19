import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_ORG_SETTINGS, type OrgSettings, type Result } from "@magic-vault/shared";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";

export const orgSettingsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["org-settings", orgId] as const,
    queryFn: () =>
      apiGet<{ success: boolean; data?: OrgSettings }>("/api/org-settings").then(
        (r) => r.data ?? DEFAULT_ORG_SETTINGS,
      ),
    enabled: !!orgId,
    staleTime: Infinity,
  });

export function saveOrgSettings(patch: Partial<OrgSettings>): Promise<OrgSettings> {
  return unwrap(apiPut<Result<OrgSettings>>("/api/org-settings", patch));
}
