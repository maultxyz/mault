import { queryOptions } from "@tanstack/react-query";
import {
  createDefaultBinRoutes,
  DEFAULT_FEEDER_CALIBRATION,
  DEFAULT_MODULE_COUNT,
  type BinRoute,
  type BinSet,
  type FeederCalibration,
  type ModuleConfig,
  type Result,
  SORTER_LINKS_REFETCH_MS,
  type SorterLinkStatus,
} from "@magic-vault/shared";
import { ApiStatusError } from "@/lib/api/api-status-error";
import { apiDelete, apiGet, apiPost, apiRequest, unwrap } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import type { Device } from "@/lib/interfaces/devices";

export const devicesQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["devices", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<Device[]>>("/api/devices")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export const sorterLinksQueryOptions = (orgId: string | null, poll: boolean) =>
  queryOptions({
    queryKey: ["sorter-links", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<SorterLinkStatus[]>>("/api/devices/sorter-links")),
    enabled: !!orgId,
    refetchInterval: poll ? SORTER_LINKS_REFETCH_MS : false,
  });

export const binRoutesQueryOptions = (deviceGuid: string | null) =>
  queryOptions({
    queryKey: ["bin-routes", deviceGuid] as const,
    queryFn: () =>
      apiGet<Result<BinRoute[]>>(`/api/devices/${deviceGuid}/bin-routes`).then(
        (r) => r.data ?? createDefaultBinRoutes(DEFAULT_MODULE_COUNT),
      ),
    enabled: !!deviceGuid,
    staleTime: Infinity,
  });

export const binSetsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["bin-sets", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<BinSet[]>>("/api/bins")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export function resolveDevice(hardwareId: string): Promise<Device> {
  return unwrap(apiPost<Result<Device>>("/api/devices/resolve", { hardwareId }));
}

export async function acquireDeviceLease(guid: string): Promise<boolean> {
  try {
    const body = await apiRequest<{ sorterLimitReached?: boolean }>(
      `/api/devices/${guid}/lease`,
      { method: "POST", acceptStatuses: [402] },
    );
    return !body.sorterLimitReached;
  } catch (err) {
    return !(err instanceof ApiStatusError && err.status === 403);
  }
}

export async function releaseDeviceLease(guid: string): Promise<void> {
  await apiDelete(`/api/devices/${guid}/lease`).catch(() => {});
}

export async function fetchModuleConfigs(deviceGuid: string): Promise<ModuleConfig[]> {
  const result = await apiGet<Result<ModuleConfig[]>>(`/api/devices/${deviceGuid}/modules`);
  return result.data ?? [];
}

export async function fetchFeederConfig(deviceGuid: string): Promise<FeederCalibration> {
  const result = await apiGet<Result<FeederCalibration>>(`/api/devices/${deviceGuid}/feeder`);
  return result.data ?? { ...DEFAULT_FEEDER_CALIBRATION };
}
