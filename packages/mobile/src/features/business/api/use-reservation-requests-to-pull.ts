import { groupCardReservationsByRequest, type CardReservationRequestGroup } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { cardReservationsQueryOptions } from "@/features/business/api/business";
import { useActiveOrgId } from "@/hooks/use-org";

export function useReservationRequestsToPull(): CardReservationRequestGroup[] {
  const orgId = useActiveOrgId();
  const { data: access } = useQuery(businessAccessQueryOptions(orgId));
  const canFulfilOrders = !!access && !access.isLocked && access.canFulfilOrders;
  const { data } = useQuery(cardReservationsQueryOptions(orgId, "active", canFulfilOrders));
  return useMemo(
    () => groupCardReservationsByRequest(data ?? []).filter((group) => group.toPullCount > 0),
    [data],
  );
}
