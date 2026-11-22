import { useQuery } from "@tanstack/react-query";
import { openIntakeLotsQueryOptions } from "@/features/business/api/business";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { useActiveOrgId } from "@/hooks/use-org";

export function useCanStartBuy(collectionGuid: string | null): boolean {
  const orgId = useActiveOrgId();
  const hasBusinessTools = useHasBusinessTools();
  const openBuys = useQuery(openIntakeLotsQueryOptions(orgId, hasBusinessTools && !!collectionGuid, null));
  return (
    hasBusinessTools &&
    !!collectionGuid &&
    openBuys.isSuccess &&
    !openBuys.data.some((lot) => lot.collectionGuid === collectionGuid)
  );
}
