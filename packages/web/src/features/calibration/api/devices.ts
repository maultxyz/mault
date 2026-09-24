import {
  API_BASE,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getAuthHeaders,
  handleForbidden,
} from "@/lib/api/client";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_MODULE_COUNT,
  DEFAULT_SCAN_REGION,
  type ChannelLayout,
  type Result,
  type ScanRegion,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export interface Device {
  guid: string;
  name: string;
  hardwareId: string | null;
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  matchesNeeded: number;
  moduleCount: number;
  channelLayout: ChannelLayout;
  createdAt: string;
  updatedAt: string;
}

export interface DevicePatch {
  name?: string;
  hardwareId?: string | null;
  scanRegion?: ScanRegion | null;
  captureSettleDelayMs?: number | null;
  matchesNeeded?: number | null;
  moduleCount?: number;
  channelLayout?: ChannelLayout;
}

export const DEFAULT_DEVICE: Device = {
  guid: "",
  name: "Card Sorter",
  hardwareId: null,
  scanRegion: DEFAULT_SCAN_REGION,
  captureSettleDelayMs: DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  matchesNeeded: DEFAULT_MATCHES_NEEDED,
  moduleCount: DEFAULT_MODULE_COUNT,
  channelLayout: DEFAULT_CHANNEL_LAYOUT,
  createdAt: "",
  updatedAt: "",
};

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
