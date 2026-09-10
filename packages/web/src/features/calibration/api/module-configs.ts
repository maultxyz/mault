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

export const modulesQueryOptions = queryOptions({
  queryKey: ["modules"] as const,
  queryFn: () =>
    getModuleConfigs().then((r) => r.data ?? defaultModuleConfigs()),
  staleTime: Infinity,
});

export async function getModuleConfigs(): Promise<Result<ModuleConfig[]>> {
  return apiGet<Result<ModuleConfig[]>>("/api/modules");
}

export async function saveModuleConfig(
  moduleNumber: number,
  calibration: ServoCalibration,
): Promise<Result<ModuleConfig[]>> {
  return apiPut<Result<ModuleConfig[]>>(
    `/api/modules/${moduleNumber}`,
    calibration,
  );
}

export async function getModuleHistory(): Promise<
  Result<ModuleConfigAuditEntry[]>
> {
  return apiGet<Result<ModuleConfigAuditEntry[]>>("/api/modules/history");
}

export async function revertModuleConfig(
  guid: string,
): Promise<Result<ModuleConfig[]>> {
  return apiPost<Result<ModuleConfig[]>>(`/api/modules/history/${guid}/revert`);
}
