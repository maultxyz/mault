import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  SORTER_LINK_CLIENT_PATH,
  SORTER_LINK_DEVICE_PATH,
} from "@magic-vault/shared";

export function toWebSocketUrl(path: string): URL {
  const url = new URL(`${API_BASE}/api${path}`, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url;
}

export function defaultSorterLinkDeviceUrl(): string {
  return toWebSocketUrl(SORTER_LINK_DEVICE_PATH).toString();
}

export { parseWifiStatus } from "@magic-vault/shared";

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
