import {
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  SHARE_LINK_TOKEN_PARAM,
  WATCH_PATH_PREFIX,
} from "@magic-vault/shared";
import { apiPost } from "@/lib/api/client";
import type {
  MonitorLink,
  MonitorLinkInfo,
  Result,
} from "@magic-vault/shared";
import { API_BASE } from "@/lib/constants/api";

export function createMonitorLink(
  collectionGuid: string,
  expiresInDays: number,
  showPrices = DEFAULT_SHARE_LINK_SHOWS_PRICES,
  holdMinutes: number | null = null,
): Promise<Result<MonitorLink>> {
  return apiPost<Result<MonitorLink>>(
    `/api/collections/${collectionGuid}/monitor-link`,
    { expiresInDays, showPrices, holdMinutes },
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
  const params = new URLSearchParams({ [SHARE_LINK_TOKEN_PARAM]: token });
  return `${window.location.origin}${WATCH_PATH_PREFIX}/${collectionGuid}?${params}`;
}
