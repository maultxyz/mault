import { queryOptions } from "@tanstack/react-query";
import {
  DEFAULT_FEEDER_CALIBRATION,
  type BinHeight,
  type BinRoute,
  type FeederCalibration,
  type ModuleConfig,
  type Result,
  type ServoCalibration,
} from "@magic-vault/shared";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";
import type { DevicePatch } from "@/lib/interfaces/calibration";
import type { Device } from "@/lib/interfaces/devices";

export const moduleConfigsQueryOptions = (deviceGuid: string | null) =>
  queryOptions({
    queryKey: ["modules", deviceGuid] as const,
    queryFn: () => unwrap(apiGet<Result<ModuleConfig[]>>(`/api/devices/${deviceGuid}/modules`)),
    enabled: !!deviceGuid,
  });

export const feederConfigQueryOptions = (deviceGuid: string | null) =>
  queryOptions({
    queryKey: ["feeder", deviceGuid] as const,
    queryFn: () =>
      apiGet<Result<FeederCalibration>>(`/api/devices/${deviceGuid}/feeder`).then(
        (result) => result.data ?? DEFAULT_FEEDER_CALIBRATION,
      ),
    enabled: !!deviceGuid,
  });

export function saveModuleConfig(
  deviceGuid: string,
  moduleNumber: number,
  calibration: ServoCalibration,
): Promise<ModuleConfig[]> {
  return unwrap(apiPut<Result<ModuleConfig[]>>(`/api/devices/${deviceGuid}/modules/${moduleNumber}`, calibration));
}

export function saveFeederConfig(deviceGuid: string, calibration: FeederCalibration): Promise<FeederCalibration> {
  return unwrap(apiPut<Result<FeederCalibration>>(`/api/devices/${deviceGuid}/feeder`, calibration));
}

export const binHeightsQueryOptions = (deviceGuid: string | null) =>
  queryOptions({
    queryKey: ["bin-heights", deviceGuid] as const,
    queryFn: () =>
      apiGet<Result<BinHeight[]>>(`/api/devices/${deviceGuid}/bin-heights`).then((result) => result.data ?? []),
    enabled: !!deviceGuid,
  });

export function saveDevice(guid: string, patch: DevicePatch): Promise<Device> {
  return unwrap(apiPut<Result<Device>>(`/api/devices/${guid}`, patch));
}

export function saveBinRoute(deviceGuid: string, route: BinRoute): Promise<BinRoute[]> {
  return unwrap(apiPut<Result<BinRoute[]>>(`/api/devices/${deviceGuid}/bin-routes/${route.binNumber}`, route));
}

export function saveBinHeight(deviceGuid: string, binNumber: number, height: number): Promise<BinHeight[]> {
  return unwrap(apiPut<Result<BinHeight[]>>(`/api/devices/${deviceGuid}/bin-heights/${binNumber}`, { binNumber, height }));
}
