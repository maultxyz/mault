import { useOrg } from "@/features/companies/api/use-organization";
import { orgProfileSettingsQueryOptions } from "@/features/org-profile/api/org-profile";
import { useSecondaryRequestsEnabled } from "@/lib/initial-load-context";
import { buildOrgProfileUrl } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";

export function usePublishedOrgProfileUrl(): string | null {
  const { activeOrg } = useOrg();
  const areSecondaryRequestsEnabled = useSecondaryRequestsEnabled();
  const { data } = useQuery({
    ...orgProfileSettingsQueryOptions(activeOrg?.id),
    enabled: !!activeOrg?.id && areSecondaryRequestsEnabled,
  });
  const profile = data?.profile;
  return profile?.isPublished ? buildOrgProfileUrl(window.location.origin, profile) : null;
}
