import { billingQueryOptions } from "@/features/billing/api/billing";
import { openIntakeLotsQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { useSecondaryRequestsEnabled } from "@/lib/initial-load-context";
import type { OpenBuyState } from "@/lib/interfaces/business";
import { useQuery } from "@tanstack/react-query";

export function useOpenBuy(collectionGuid: string | undefined): OpenBuyState {
  const { orgId, access } = useBusinessAccess();
  const billingQuery = useQuery(billingQueryOptions(orgId));
  const hasBusinessTools = billingQuery.data?.businessTools === true;
  const areSecondaryRequestsEnabled = useSecondaryRequestsEnabled();
  const openBuysQuery = useQuery({
    ...openIntakeLotsQueryOptions(orgId),
    enabled: !!orgId && areSecondaryRequestsEnabled,
  });
  const openBuy =
    hasBusinessTools && collectionGuid
      ? (openBuysQuery.data?.find(
          (lot) =>
            lot.status === "open" && lot.collectionGuid === collectionGuid,
        ) ?? null)
      : null;
  return {
    openBuy,
    hasLoaded: openBuysQuery.isSuccess && billingQuery.isSuccess,
    canStartBuy:
      hasBusinessTools &&
      !!access &&
      !access.isLocked &&
      !!collectionGuid &&
      openBuysQuery.isSuccess &&
      !openBuy,
  };
}
