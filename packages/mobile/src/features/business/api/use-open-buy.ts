import type { IntakeLot } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { openIntakeLotsQueryOptions } from "@/features/business/api/business";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { useActiveOrgId } from "@/hooks/use-org";

export function useOpenBuy(collectionGuid: string | null, isWatching: boolean): IntakeLot | null {
  const orgId = useActiveOrgId();
  const hasBusinessTools = useHasBusinessTools();
  const openBuys = useQuery(
    openIntakeLotsQueryOptions(orgId, hasBusinessTools && !!collectionGuid, isWatching ? collectionGuid : null),
  );
  return openBuys.data?.find((lot) => lot.collectionGuid === collectionGuid) ?? null;
}
