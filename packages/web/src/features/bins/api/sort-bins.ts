import type {
  BinConfig,
  BinRuleGroup,
  BinSet,
  DefaultBinInit,
  EmptyBinOptions,
  RepackSlot,
  Result,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { BinSetAuditEntry } from "@/lib/interfaces/audit";
import type { AlphabetConfig, ChaosConfig } from "@/lib/interfaces/bins";
import { queryOptions } from "@tanstack/react-query";

export type { BinSetAuditEntry };

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
  return apiPost<Result<BinSet[]>>("/api/bins", {
    name,
    initialBins,
    gameGuid,
  });
}

export async function saveSet(
  name: string,
  gameGuid?: string,
): Promise<Result<BinSet[]>> {
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

export async function checkSetName(
  name: string,
  gameGuid?: string,
  excludeGuid?: string,
): Promise<Result<{ available: boolean }>> {
  const params = new URLSearchParams({ name });
  if (gameGuid) params.set("gameGuid", gameGuid);
  if (excludeGuid) params.set("excludeGuid", excludeGuid);
  return apiGet<Result<{ available: boolean }>>(
    `/api/bins/check-name?${params.toString()}`,
  );
}

export async function saveBinConfig({
  binNumber,
  rules,
  isCatchAll,
  isOverride,
  cardLimit,
  maxCopies,
  isDisabled,
  gameGuid,
}: {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll?: boolean;
  isOverride?: boolean;
  cardLimit?: number | null;
  maxCopies?: number | null;
  isDisabled?: boolean;
  gameGuid?: string;
}): Promise<Result<BinConfig[]>> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  return apiPut<Result<BinConfig[]>>(`/api/bins/bins/${binNumber}${params}`, {
    rules,
    isCatchAll,
    isOverride,
    cardLimit,
    maxCopies,
    isDisabled,
  });
}

export async function emptyBin(
  binNumber: number,
  gameGuid?: string,
  options: EmptyBinOptions = {},
): Promise<Result<BinConfig[]> & { assignedCount?: number }> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  return apiPost<Result<BinConfig[]> & { assignedCount?: number }>(
    `/api/bins/bins/${binNumber}/empty${params}`,
    options,
  );
}

export async function setChaosMode(
  guid: string,
  config: ChaosConfig,
): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}/chaos`, config);
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

export async function setScanOnly(
  guid: string,
  enabled: boolean,
): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}/scan-only`, { enabled });
}

export async function setRepackConfig(
  guid: string,
  config: {
    isRepackMode: boolean;
    repackSlots: RepackSlot[];
    repackAllowDuplicates: boolean;
    repackSiftRules: BinRuleGroup | null;
  },
): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}/repack`, config);
}

export async function setAlphabetConfig(
  guid: string,
  config: AlphabetConfig,
): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}/alphabet`, config);
}

export async function getBinSetHistory(
  setGuid: string,
): Promise<Result<BinSetAuditEntry[]>> {
  return apiGet<Result<BinSetAuditEntry[]>>(
    `/api/bins/history?setGuid=${encodeURIComponent(setGuid)}`,
  );
}

export async function revertBinSet(guid: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>(`/api/bins/history/${guid}/revert`);
}
