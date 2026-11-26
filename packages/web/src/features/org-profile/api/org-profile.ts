import { fetchPublicCards, publicCardsKeys } from "@/features/public-cards/api/public-cards";
import { apiGet, apiPut } from "@/lib/api/client";
import { ORG_PROFILE_SETTINGS_QUERY_KEY } from "@/lib/constants/org-profile";
import { PUBLIC_CARDS_SOURCE_PATHS } from "@/lib/constants/public-cards";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import {
  ORG_PROFILE_HANDLE_PARAM,
  type OrgProfileInput,
  type OrgProfileSaveResult,
  type OrgProfileSettings,
  type PublicOrgProfileInfo,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const orgProfileKeys = {
  settings: (orgId: string | undefined) => [ORG_PROFILE_SETTINGS_QUERY_KEY, orgId] as const,
};

export const orgProfileSettingsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: orgProfileKeys.settings(orgId),
    queryFn: async ({ signal }) => {
      const result = await apiGet<Result<OrgProfileSettings>>("/api/org-profile", { signal });
      if (!result.success || !result.data) throw new Error(result.message);
      return result.data;
    },
    enabled: !!orgId,
  });

export function saveOrgProfile(input: OrgProfileInput): Promise<OrgProfileSaveResult> {
  return apiPut<OrgProfileSaveResult>("/api/org-profile", input);
}

export function orgProfileSource(handle: string): PublicCardsSource {
  return {
    basePath: PUBLIC_CARDS_SOURCE_PATHS.profile,
    linkParams: { [ORG_PROFILE_HANDLE_PARAM]: handle },
  };
}

export const publicOrgProfileQueryOptions = (source: PublicCardsSource) =>
  queryOptions({
    queryKey: publicCardsKeys.info(source),
    queryFn: () =>
      fetchPublicCards<PublicOrgProfileInfo>(
        source.basePath,
        "",
        new URLSearchParams(source.linkParams),
      ),
    retry: false,
  });
