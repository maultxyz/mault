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

export const binRoutesQueryOptions = queryOptions({
  queryKey: ["bin-routes"] as const,
  queryFn: () => getBinRoutes().then((r) => r.data ?? defaultRoutes()),
  staleTime: Infinity,
});

export async function getBinRoutes(): Promise<Result<BinRoute[]>> {
  return apiGet<Result<BinRoute[]>>("/api/bin-routes");
}

export async function saveBinRoute(route: BinRoute): Promise<Result<BinRoute[]>> {
  return apiPut<Result<BinRoute[]>>(`/api/bin-routes/${route.binNumber}`, route);
}

export async function deleteBinRoute(binNumber: number): Promise<Result<BinRoute[]>> {
  return apiDelete<Result<BinRoute[]>>(`/api/bin-routes/${binNumber}`);
}

export async function getBinRouteHistory(): Promise<Result<BinRouteAuditEntry[]>> {
  return apiGet<Result<BinRouteAuditEntry[]>>("/api/bin-routes/history");
}

export async function revertBinRoute(guid: string): Promise<Result<BinRoute[]>> {
  return apiPost<Result<BinRoute[]>>(`/api/bin-routes/history/${guid}/revert`);
}
