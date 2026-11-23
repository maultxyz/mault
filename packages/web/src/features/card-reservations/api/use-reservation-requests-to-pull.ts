import { businessSettingsQueryOptions } from "@/features/business/api/business";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { cardReservationsQueryOptions } from "@/features/card-reservations/api/card-reservations";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSecondaryRequestsEnabled } from "@/lib/initial-load-context";
import { groupCardReservationsByRequest, type CardReservationRequestGroup } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useReservationRequestsToPull(): CardReservationRequestGroup[] {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const hasBusinessTools = useHasBusinessTools();
  const secondaryRequestsEnabled = useSecondaryRequestsEnabled();
  const loadsBusinessData = !!orgId && hasBusinessTools && secondaryRequestsEnabled;
  const { data: business } = useQuery({
    ...businessSettingsQueryOptions(orgId),
    enabled: loadsBusinessData,
  });
  const { data } = useQuery({
    ...cardReservationsQueryOptions(orgId, "active"),
    enabled: loadsBusinessData && business?.access.canFulfilOrders === true,
  });
  return useMemo(
    () => groupCardReservationsByRequest(data ?? []).filter((group) => group.toPullCount > 0),
    [data],
  );
}
