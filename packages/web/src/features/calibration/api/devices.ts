import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getAuthHeaders,
  handleForbidden,
} from "@/lib/api/client";
import type { Device } from "@/lib/interfaces/calibration";
import type { DevicePatch, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { API_BASE } from "@/lib/constants/api";

export const devicesQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["devices", orgId] as const,
    queryFn: () => getDevices().then((r) => r.data ?? []),
    staleTime: Infinity,
    enabled: !!orgId,
  });

export async function getDevices(): Promise<Result<Device[]>> {
  return apiGet<Result<Device[]>>("/api/devices");
}

export async function createDevice(name?: string): Promise<Result<Device>> {
  return apiPost<Result<Device>>("/api/devices", name ? { name } : undefined);
}

export async function resolveDevice(
  hardwareId: string,
): Promise<Result<Device>> {
  return apiPost<Result<Device>>("/api/devices/resolve", { hardwareId });
}

// Resolves false only when the server refused because the org is already at
// its plan's connected-sorter cap. Any other failure resolves true: the
// server re-checks on every scanned card, so a flaky lease call shouldn't
// block a sorter the plan allows.
export async function acquireDeviceLease(guid: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${guid}/lease`, {
      method: "POST",
      headers: { ...(await getAuthHeaders()) },
    });
    await handleForbidden(res);
    if (res.status !== 402) return true;
    const body = (await res.json()) as { sorterLimitReached?: boolean };
    return !body.sorterLimitReached;
  } catch {
    return true;
  }
}

export async function releaseDeviceLease(guid: string): Promise<void> {
  await apiDelete(`/api/devices/${guid}/lease`).catch(() => {});
}

export async function saveDevice(
  guid: string,
  patch: DevicePatch,
): Promise<Result<Device>> {
  return apiPut<Result<Device>>(`/api/devices/${guid}`, patch);
}

export async function deleteDevice(guid: string): Promise<Result<void>> {
  return apiDelete<Result<void>>(`/api/devices/${guid}`);
}
