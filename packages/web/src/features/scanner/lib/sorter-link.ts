import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  SORTER_LINK_CLIENT_PATH,
  SORTER_LINK_DEVICE_PATH,
  type CloudLinkState,
  type SorterWifiStatus,
  type WifiLinkState,
} from "@magic-vault/shared";

function toWebSocketUrl(path: string): URL {
  const url = new URL(`${API_BASE}/api${path}`, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url;
}

export function defaultSorterLinkDeviceUrl(): string {
  return toWebSocketUrl(SORTER_LINK_DEVICE_PATH).toString();
}

export async function sorterLinkClientUrl(
  deviceGuid: string,
): Promise<string | null> {
  const { token, orgId } = await getRequestAuth();
  if (!token || !orgId) return null;
  const url = toWebSocketUrl(SORTER_LINK_CLIENT_PATH);
  url.searchParams.set("token", token);
  url.searchParams.set("orgId", orgId);
  url.searchParams.set("device", deviceGuid);
  return url.toString();
}

export function parseWifiStatus(line: string): SorterWifiStatus | null {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    if (typeof parsed.wifi !== "string" || typeof parsed.cloud !== "string") {
      return null;
    }
    return {
      wifi: parsed.wifi as WifiLinkState,
      ssid: typeof parsed.ssid === "string" ? parsed.ssid : null,
      ip: typeof parsed.ip === "string" ? parsed.ip : null,
      rssi: typeof parsed.rssi === "number" ? parsed.rssi : null,
      cloud: parsed.cloud as CloudLinkState,
      host: typeof parsed.host === "string" ? parsed.host : null,
    };
  } catch {
    return null;
  }
}
