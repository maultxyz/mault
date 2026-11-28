import { buildOrgProfileUrl } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { orgProfileQueryOptions } from "@/features/org-profile/api/org-profile";
import { useActiveOrgId } from "@/hooks/use-org";
import { WEB_URL } from "@/lib/constants/config";

export function usePublishedOrgProfileUrl(): string | null {
  const orgId = useActiveOrgId();
  const { data } = useQuery(orgProfileQueryOptions(orgId));
  const profile = data?.profile;
  return profile?.isPublished ? buildOrgProfileUrl(WEB_URL, profile) : null;
}
