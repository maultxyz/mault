import { queryOptions } from "@tanstack/react-query";
import type { CardAcquisitionCost, Result } from "@magic-vault/shared";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";
import { collectionCardDetailKeys } from "@/features/collections/api/card-details";

export const cardAcquisitionCostQueryOptions = (orgId: string | null | undefined, scanId: string) =>
  queryOptions({
    queryKey: collectionCardDetailKeys.cost(orgId, scanId),
    queryFn: () =>
      apiGet<Result<CardAcquisitionCost>>(`/api/business/cost/cards/${scanId}`).then((result) =>
        result.success ? (result.data ?? null) : null,
      ),
    enabled: !!orgId && !!scanId,
  });

export function setCardAcquisitionCost(scanId: string, cost: number | null) {
  return unwrap(apiPut<Result<CardAcquisitionCost>>(`/api/business/cost/cards/${scanId}`, { cost }));
}
