import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useQuery } from "@tanstack/react-query";

export function useFoilDetectionGameKey(
  gameKey: string | null | undefined,
): string | null {
  const isMobile = useIsMobile();
  const { activeOrg } = useOrg();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  return !isMobile && orgSettings?.foilDetectionEnabled
    ? (gameKey ?? null)
    : null;
}
