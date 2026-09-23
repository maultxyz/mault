import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { BinHeightAuditEntry } from "@/lib/interfaces/audit";
import type { BinHeight, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export type { BinHeightAuditEntry };

export const binHeightsQueryOptions = (deviceGuid: string | undefined) =>
  queryOptions({
    queryKey: ["bin-heights", deviceGuid] as const,
    queryFn: () => getBinHeights(deviceGuid!).then((r) => r.data ?? []),
    staleTime: Infinity,
    enabled: !!deviceGuid,
  });

export async function getBinHeights(
  deviceGuid: string,
): Promise<Result<BinHeight[]>> {
  return apiGet<Result<BinHeight[]>>(`/api/devices/${deviceGuid}/bin-heights`);
}

export async function saveBinHeight(
  deviceGuid: string,
  binNumber: number,
  height: number,
): Promise<Result<BinHeight[]>> {
  return apiPut<Result<BinHeight[]>>(
    `/api/devices/${deviceGuid}/bin-heights/${binNumber}`,
    { binNumber, height },
  );
}

export async function deleteBinHeight(
  deviceGuid: string,
  binNumber: number,
): Promise<Result<BinHeight[]>> {
  return apiDelete<Result<BinHeight[]>>(
    `/api/devices/${deviceGuid}/bin-heights/${binNumber}`,
  );
}

export async function getBinHeightHistory(
  deviceGuid: string,
): Promise<Result<BinHeightAuditEntry[]>> {
  return apiGet<Result<BinHeightAuditEntry[]>>(
    `/api/devices/${deviceGuid}/bin-heights/history`,
  );
}

export async function revertBinHeight(
  deviceGuid: string,
  guid: string,
): Promise<Result<BinHeight[]>> {
  return apiPost<Result<BinHeight[]>>(
    `/api/devices/${deviceGuid}/bin-heights/history/${guid}/revert`,
  );
}
