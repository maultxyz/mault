import {
  DEFAULT_SHARE_LINK_PURPOSE,
  DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT,
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
} from "@magic-vault/shared";
import { apiPost } from "@/lib/api/client";
import type {
  MonitorLink,
  MonitorLinkInfo,
  Result,
  ShareLinkPurpose,
} from "@magic-vault/shared";
import { API_BASE } from "@/lib/constants/api";

export function createMonitorLink(
  collectionGuid: string,
  expiresInDays: number,
  showPrices = DEFAULT_SHARE_LINK_SHOWS_PRICES,
  purpose: ShareLinkPurpose = DEFAULT_SHARE_LINK_PURPOSE,
  requireGuestContact = DEFAULT_SHARE_LINK_REQUIRES_GUEST_CONTACT,
): Promise<Result<MonitorLink>> {
  return apiPost<Result<MonitorLink>>(
    `/api/collections/${collectionGuid}/monitor-link`,
    { expiresInDays, showPrices, purpose, requireGuestContact },
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

