import type { CardAcquisitionCost, Result } from "@magic-vault/shared";
import { apiPut, unwrap } from "@/lib/api/client";

export function setCardAcquisitionCost(scanId: string, cost: number | null) {
  return unwrap(apiPut<Result<CardAcquisitionCost>>(`/api/business/cost/cards/${scanId}`, { cost }));
}
