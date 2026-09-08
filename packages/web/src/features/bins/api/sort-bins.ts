import type {
  BinConfig,
  BinRuleGroup,
  BinSet,
  DefaultBinInit,
  Result,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { queryOptions } from "@tanstack/react-query";

export async function loadSets(): Promise<Result<BinSet[]>> {
  return apiGet<Result<BinSet[]>>("/api/bins");
}

export const binsQueryOptions = queryOptions({
  queryKey: ["bins"] as const,
  queryFn: () => loadSets().then((r) => r.data ?? []),
  staleTime: Infinity,
});

export async function activateSet(guid: string): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}/active`);
}

export async function createSet(
  name: string,
  initialBins?: DefaultBinInit[],
  gameGuid?: string,
): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>("/api/bins", { name, initialBins, gameGuid });
}

export async function saveSet(name: string, gameGuid?: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>("/api/bins/copies", { name, gameGuid });
}

export async function renameSet(
  guid: string,
  name: string,
): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}`, { name });
}

export async function deleteSet(guid: string): Promise<Result<BinSet[]>> {
  return apiDelete<Result<BinSet[]>>(`/api/bins/${guid}`);
}

export async function saveBinConfig({
  binNumber,
  rules,
  isCatchAll,
  gameGuid,
}: {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll?: boolean;
  gameGuid?: string;
}): Promise<Result<BinConfig[]>> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  return apiPut<Result<BinConfig[]>>(`/api/bins/bins/${binNumber}${params}`, {
    rules,
    isCatchAll,
  });
}

export async function clearBinConfig(
  binNumber: number,
  gameGuid?: string,
): Promise<Result<null>> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  return apiDelete<Result<null>>(`/api/bins/bins/${binNumber}${params}`);
}

export async function setAutoAssignField(
  guid: string,
  field: string | null,
): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}/auto-assign`, { field });
}

export async function resetAutoAssign(guid: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>(`/api/bins/${guid}/auto-assign/reset`);
}

export interface BinSetAuditEntry {
  guid: string;
  binSetGuid: string;
  snapshot: BinConfig[];
  createdAt: string;
}

export async function getBinSetHistory(setGuid: string): Promise<Result<BinSetAuditEntry[]>> {
  return apiGet<Result<BinSetAuditEntry[]>>(`/api/bins/history?setGuid=${encodeURIComponent(setGuid)}`);
}

export async function revertBinSet(guid: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>(`/api/bins/history/${guid}/revert`);
}
