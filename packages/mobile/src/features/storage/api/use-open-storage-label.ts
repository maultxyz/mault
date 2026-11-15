import type { StorageLabelTarget } from "@magic-vault/shared";
import { router } from "expo-router";
import { useSwitchOrg } from "@/hooks/use-org";
import { useSession } from "@/lib/auth/session";

export function useOpenStorageLabel(): (target: StorageLabelTarget) => void {
  const { organizations } = useSession();
  const switchOrg = useSwitchOrg();
  return (target) => {
    if (organizations.some((org) => org.id === target.orgId)) switchOrg(target.orgId);
    router.push({ pathname: "/storage/[guid]", params: { guid: target.locationGuid } });
  };
}
