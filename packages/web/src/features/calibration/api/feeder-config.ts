import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type { FeederConfigAuditEntry } from "@/lib/interfaces/audit";
import type { FeederCalibration, Result } from "@magic-vault/shared";
import { DEFAULT_FEEDER_CALIBRATION } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export type { FeederConfigAuditEntry };

export const feederQueryOptions = (deviceGuid: string | undefined) =>
  queryOptions({
    queryKey: ["feeder", deviceGuid] as const,
    queryFn: () =>
      getFeederConfig(deviceGuid!).then(
        (r) => r.data ?? { ...DEFAULT_FEEDER_CALIBRATION },
      ),
    staleTime: Infinity,
    enabled: !!deviceGuid,
  });

export async function getFeederConfig(
  deviceGuid: string,
): Promise<Result<FeederCalibration>> {
  return apiGet<Result<FeederCalibration>>(`/api/devices/${deviceGuid}/feeder`);
}

export async function saveFeederConfig(
  deviceGuid: string,
  calibration: FeederCalibration,
): Promise<Result<FeederCalibration>> {
  return apiPut<Result<FeederCalibration>>(
    `/api/devices/${deviceGuid}/feeder`,
    calibration,
  );
}

export async function getFeederHistory(
  deviceGuid: string,
): Promise<Result<FeederConfigAuditEntry[]>> {
  return apiGet<Result<FeederConfigAuditEntry[]>>(
    `/api/devices/${deviceGuid}/feeder/history`,
  );
}

export async function revertFeederConfig(
  deviceGuid: string,
  guid: string,
): Promise<Result<FeederCalibration>> {
  return apiPost<Result<FeederCalibration>>(
    `/api/devices/${deviceGuid}/feeder/history/${guid}/revert`,
  );
}
