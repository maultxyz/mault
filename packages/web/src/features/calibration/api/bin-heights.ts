import { apiGet, apiPut } from "@/lib/api/client";
import type { BinHeight, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";


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
