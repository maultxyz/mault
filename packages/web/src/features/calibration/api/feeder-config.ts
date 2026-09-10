import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { FeederConfigAuditEntry } from "@/lib/interfaces/audit";
import type { FeederCalibration, Result } from "@magic-vault/shared";
import { DEFAULT_FEEDER_CALIBRATION } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export type { FeederConfigAuditEntry };

export const feederQueryOptions = queryOptions({
  queryKey: ["feeder"] as const,
  queryFn: () =>
    getFeederConfig().then((r) => r.data ?? { ...DEFAULT_FEEDER_CALIBRATION }),
  staleTime: Infinity,
});

export async function getFeederConfig(): Promise<Result<FeederCalibration>> {
  return apiGet<Result<FeederCalibration>>("/api/feeder");
}

export async function saveFeederConfig(
  calibration: FeederCalibration,
): Promise<Result<FeederCalibration>> {
  return apiPut<Result<FeederCalibration>>("/api/feeder", calibration);
}

export async function getFeederHistory(): Promise<
  Result<FeederConfigAuditEntry[]>
> {
  return apiGet<Result<FeederConfigAuditEntry[]>>("/api/feeder/history");
}

export async function revertFeederConfig(
  guid: string,
): Promise<Result<FeederCalibration>> {
  return apiPost<Result<FeederCalibration>>(
    `/api/feeder/history/${guid}/revert`,
  );
}
