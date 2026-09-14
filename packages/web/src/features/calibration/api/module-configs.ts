import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { ModuleConfigAuditEntry } from "@/lib/interfaces/audit";
import type {
  ModuleConfig,
  Result,
  ServoCalibration,
} from "@magic-vault/shared";
import { DEFAULT_CALIBRATION, DEFAULT_MODULE_COUNT } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export type { ModuleConfigAuditEntry };

function defaultModuleConfigs(): ModuleConfig[] {
  return Array.from({ length: DEFAULT_MODULE_COUNT }, (_, i) => ({
    moduleNumber: i + 1,
    calibration: { ...DEFAULT_CALIBRATION },
  }));
}

export const modulesQueryOptions = (deviceGuid: string | undefined) =>
  queryOptions({
    queryKey: ["modules", deviceGuid] as const,
    queryFn: () =>
      getModuleConfigs(deviceGuid!).then((r) => r.data ?? defaultModuleConfigs()),
    staleTime: Infinity,
    enabled: !!deviceGuid,
  });

export async function getModuleConfigs(
  deviceGuid: string,
): Promise<Result<ModuleConfig[]>> {
  return apiGet<Result<ModuleConfig[]>>(`/api/devices/${deviceGuid}/modules`);
}

export async function saveModuleConfig(
  deviceGuid: string,
  moduleNumber: number,
  calibration: ServoCalibration,
): Promise<Result<ModuleConfig[]>> {
  return apiPut<Result<ModuleConfig[]>>(
    `/api/devices/${deviceGuid}/modules/${moduleNumber}`,
    calibration,
  );
}

export async function getModuleHistory(
  deviceGuid: string,
): Promise<Result<ModuleConfigAuditEntry[]>> {
  return apiGet<Result<ModuleConfigAuditEntry[]>>(
    `/api/devices/${deviceGuid}/modules/history`,
  );
}

export async function revertModuleConfig(
  deviceGuid: string,
  guid: string,
): Promise<Result<ModuleConfig[]>> {
  return apiPost<Result<ModuleConfig[]>>(
    `/api/devices/${deviceGuid}/modules/history/${guid}/revert`,
  );
}
