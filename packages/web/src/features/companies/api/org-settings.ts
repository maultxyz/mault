import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import { queryOptions } from "@tanstack/react-query";
import { type OrgSettings, DEFAULT_ORG_SETTINGS } from "@magic-vault/shared";


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
