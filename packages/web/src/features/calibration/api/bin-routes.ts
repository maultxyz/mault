import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { BinRouteAuditEntry } from "@/lib/interfaces/audit";
import {
  createDefaultBinRoutes,
  DEFAULT_MODULE_COUNT,
  type BinRoute,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export type { BinRouteAuditEntry };

function defaultRoutes(): BinRoute[] {
  return createDefaultBinRoutes(DEFAULT_MODULE_COUNT);
}

export const binRoutesQueryOptions = (deviceGuid: string | undefined) =>
  queryOptions({
    queryKey: ["bin-routes", deviceGuid] as const,
    queryFn: () =>
      getBinRoutes(deviceGuid!).then((r) => r.data ?? defaultRoutes()),
    staleTime: Infinity,
    enabled: !!deviceGuid,
  });

export async function getBinRoutes(
  deviceGuid: string,
): Promise<Result<BinRoute[]>> {
  return apiGet<Result<BinRoute[]>>(`/api/devices/${deviceGuid}/bin-routes`);
}

export async function saveBinRoute(
  deviceGuid: string,
  route: BinRoute,
): Promise<Result<BinRoute[]>> {
  return apiPut<Result<BinRoute[]>>(
    `/api/devices/${deviceGuid}/bin-routes/${route.binNumber}`,
    route,
  );
}

export async function deleteBinRoute(
  deviceGuid: string,
  binNumber: number,
): Promise<Result<BinRoute[]>> {
  return apiDelete<Result<BinRoute[]>>(
    `/api/devices/${deviceGuid}/bin-routes/${binNumber}`,
  );
}

export async function getBinRouteHistory(
  deviceGuid: string,
): Promise<Result<BinRouteAuditEntry[]>> {
  return apiGet<Result<BinRouteAuditEntry[]>>(
    `/api/devices/${deviceGuid}/bin-routes/history`,
  );
}

export async function revertBinRoute(
  deviceGuid: string,
  guid: string,
): Promise<Result<BinRoute[]>> {
  return apiPost<Result<BinRoute[]>>(
    `/api/devices/${deviceGuid}/bin-routes/history/${guid}/revert`,
  );
}
