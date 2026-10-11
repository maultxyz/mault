import { apiPost } from "@/lib/api/client";
import { WATCH_ROUTE_PREFIX, WATCH_TOKEN_PARAM } from "@/lib/constants/nav";
import type {
  MonitorLink,
  MonitorLinkInfo,
  Result,
} from "@magic-vault/shared";
import { API_BASE } from "@/lib/constants/api";

export function createMonitorLink(
  collectionGuid: string,
  expiresInDays: number,
): Promise<Result<MonitorLink>> {
  return apiPost<Result<MonitorLink>>(
    `/api/collections/${collectionGuid}/monitor-link`,
    { expiresInDays },
  );
}

export function revokeMonitorLinks(
  collectionGuid: string,
): Promise<Result<null>> {
  return apiPost<Result<null>>(
    `/api/collections/${collectionGuid}/monitor-link/revoke`,
  );
}

export async function verifyMonitorLink(
  token: string,
): Promise<Result<MonitorLinkInfo>> {
  const params = new URLSearchParams({ token });
  const res = await fetch(`${API_BASE}/api/public/monitor-link?${params}`);
  return res.json();
}

export function buildMonitorLinkUrl(
  collectionGuid: string,
  token: string,
): string {
  const params = new URLSearchParams({ [WATCH_TOKEN_PARAM]: token });
  return `${window.location.origin}${WATCH_ROUTE_PREFIX}/${collectionGuid}?${params}`;
}
