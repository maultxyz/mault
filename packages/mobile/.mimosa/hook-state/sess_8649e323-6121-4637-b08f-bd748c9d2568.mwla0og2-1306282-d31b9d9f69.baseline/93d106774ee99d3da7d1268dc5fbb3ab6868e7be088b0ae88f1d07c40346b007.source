import type { StorageLabelTarget } from "@magic-vault/shared";
import { router } from "expo-router";
import { useSwitchOrg } from "@/hooks/use-org";
import { useSession } from "@/lib/auth/session";
import type { OpenStorageLabelOptions } from "@/lib/interfaces/storage";

export function useOpenStorageLabel(): (target: StorageLabelTarget, options?: OpenStorageLabelOptions) => void {
  const { organizations } = useSession();
  const switchOrg = useSwitchOrg();
  return (target, options) => {
    if (organizations.some((org) => org.id === target.orgId)) switchOrg(target.orgId);
    const route = { pathname: "/storage/[guid]", params: { guid: target.locationGuid } } as const;
    if (options?.replacesCurrentScreen) router.replace(route);
    else router.push(route);
  };
}
