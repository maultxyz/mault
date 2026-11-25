import { apiGet, fetchWithAuthRetry } from "@/lib/api/client";
import { RASPBERRY_PIS_QUERY_KEY } from "@/lib/constants/raspberry-pis";
import type { RaspberryPiList } from "@/lib/interfaces/raspberry-pis";
import {
  PI_HOSTS_PATH,
  piHostScanSessionPath,
  type PiHostClaimFormValues,
  type PiHostScanAction,
  type PiHostSummary,
  type PiScanSessionResult,
  type PiScanSessionSettingsBody,
  type PiScanSessionStartBody,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const raspberryPisQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: [RASPBERRY_PIS_QUERY_KEY, orgId] as const,
    queryFn: async (): Promise<RaspberryPiList> => {
      const result = await apiGet<Result<PiHostSummary[]> & { canManage?: boolean }>(
        `/api${PI_HOSTS_PATH}`,
      );
      return { hosts: result.data ?? [], canManage: result.canManage ?? false };
    },
    enabled: !!orgId,
  });

async function sendPiHostRequest<T extends { success: boolean }>(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const { res } = await fetchWithAuthRetry(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return ((await res.json().catch(() => null)) as T | null) ?? ({ success: false } as T);
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
