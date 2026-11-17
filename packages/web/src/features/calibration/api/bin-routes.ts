import { apiGet, apiPut } from "@/lib/api/client";
import {
  createDefaultBinRoutes,
  DEFAULT_MODULE_COUNT,
  type BinRoute,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";


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
