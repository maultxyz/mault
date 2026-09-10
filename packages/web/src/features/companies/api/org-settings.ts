import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import { DEFAULT_ORG_SETTINGS, type OrgSettings } from "@/lib/constants/org-settings";
import { queryOptions } from "@tanstack/react-query";

export type { OrgSettings };
export { DEFAULT_ORG_SETTINGS };

export async function getOrgSettings(): Promise<{
  success: boolean;
  data?: OrgSettings;
}> {
  return apiGet("/api/org-settings");
}

export async function saveOrgSettings(
  patch: Partial<OrgSettings>,
): Promise<{ success: boolean; data?: OrgSettings }> {
  return apiPut("/api/org-settings", patch);
}

export async function generateDiscordLinkCode(): Promise<{
  success: boolean;
  message?: string;
  data?: { code: string; expiresAt: string };
}> {
  return apiPost("/api/org-settings/discord-link-code");
}

export async function unlinkDiscord(): Promise<{
  success: boolean;
  message?: string;
}> {
  return apiPost("/api/org-settings/discord-unlink");
}

export const orgSettingsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["org-settings", orgId],
    queryFn: () => getOrgSettings().then((r) => r.data ?? DEFAULT_ORG_SETTINGS),
    staleTime: Infinity,
    enabled: !!orgId,
  });
