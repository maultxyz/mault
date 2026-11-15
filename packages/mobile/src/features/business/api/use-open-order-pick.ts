import type { OrderPickLinkTarget } from "@magic-vault/shared";
import { router } from "expo-router";
import { useSwitchOrg } from "@/hooks/use-org";
import { useSession } from "@/lib/auth/session";
import { PICK_WALK_ORDERS_SEPARATOR } from "@/lib/constants/business";

export function useOpenOrderPick(): (target: OrderPickLinkTarget) => void {
  const { organizations } = useSession();
  const switchOrg = useSwitchOrg();
  return (target) => {
    if (target.orgId && organizations.some((org) => org.id === target.orgId)) switchOrg(target.orgId);
    router.push({ pathname: "/business/pick", params: { orders: target.orderGuids.join(PICK_WALK_ORDERS_SEPARATOR) } });
  };
}
