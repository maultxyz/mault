import { queryOptions } from "@tanstack/react-query";
import {
  PI_HOSTS_PATH,
  piHostScanSessionPath,
  piHostUpdatePath,
  type PiHostClaimFormValues,
  type PiHostScanAction,
  type PiHostSummary,
  type PiScanSessionResult,
  type PiScanSessionSettingsBody,
  type PiScanSessionStartBody,
  type Result,
} from "@magic-vault/shared";
import { apiRequest } from "@/lib/api/client";
import { PI_HOST_REQUEST_ACCEPTED_STATUSES, RASPBERRY_PIS_QUERY_KEY } from "@/lib/constants/raspberry-pis";
import type { RaspberryPiList } from "@/lib/interfaces/raspberry-pis";

export const raspberryPisQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: [RASPBERRY_PIS_QUERY_KEY, orgId] as const,
    queryFn: async (): Promise<RaspberryPiList> => {
      const result = await apiRequest<Result<PiHostSummary[]> & { canManage?: boolean }>(`/api${PI_HOSTS_PATH}`);
      return { hosts: result.data ?? [], canManage: result.canManage ?? false };
    },
    enabled: !!orgId,
  });

function sendPiHostRequest<T>(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(`/api${path}`, { method, body, acceptStatuses: PI_HOST_REQUEST_ACCEPTED_STATUSES });
}

export function claimRaspberryPi(values: PiHostClaimFormValues) {
  return sendPiHostRequest<Result<PiHostSummary[]>>("POST", `${PI_HOSTS_PATH}/claim`, values);
}

export function removeRaspberryPi(guid: string) {
  return sendPiHostRequest<Result<null>>("DELETE", `${PI_HOSTS_PATH}/${encodeURIComponent(guid)}`);
}

export function renameRaspberryPi(guid: string, name: string) {
  return sendPiHostRequest<Result<null>>("PUT", `${PI_HOSTS_PATH}/${encodeURIComponent(guid)}`, { name });
}

export function updateRaspberryPiScanSettings(guid: string, body: PiScanSessionSettingsBody) {
  return sendPiHostRequest<PiScanSessionResult>("POST", piHostScanSessionPath(guid, "settings"), body);
}

export function startRaspberryPiScan(guid: string, body: PiScanSessionStartBody) {
  return sendPiHostRequest<PiScanSessionResult>("POST", piHostScanSessionPath(guid), body);
}

export function runRaspberryPiScanAction(guid: string, action: PiHostScanAction) {
  return sendPiHostRequest<PiScanSessionResult>("POST", piHostScanSessionPath(guid, action), {});
}

export function stopRaspberryPiScan(guid: string) {
  return sendPiHostRequest<PiScanSessionResult>("DELETE", piHostScanSessionPath(guid));
}

export function updateRaspberryPi(guid: string) {
  return sendPiHostRequest<Result<null>>("POST", piHostUpdatePath(guid), {});
}
