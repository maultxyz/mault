import { apiPost } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  SHARED_STORAGE_PATH_PREFIX,
  SHARE_LINK_TOKEN_PARAM,
  type Result,
  type ShareLinkPurpose,
  type StorageShareLink,
  type StorageShareLinkInfo,
} from "@magic-vault/shared";

export function createStorageShareLink(
  locationGuid: string,
  expiresInDays: number,
  showPrices: boolean,
  purpose: ShareLinkPurpose,
): Promise<Result<StorageShareLink>> {
  return apiPost<Result<StorageShareLink>>(
    `/api/storage-locations/${locationGuid}/share-link`,
    { expiresInDays, showPrices, purpose },
  );
}

export function revokeStorageShareLinks(
  locationGuid: string,
): Promise<Result<null>> {
  return apiPost<Result<null>>(
    `/api/storage-locations/${locationGuid}/share-link/revoke`,
  );
}

export async function verifyStorageShareLink(
  token: string,
): Promise<Result<StorageShareLinkInfo>> {
  const params = new URLSearchParams({ token });
  const response = await fetch(
    `${API_BASE}/api/public/storage-share-link?${params}`,
  );
  return response.json();
}

export function buildStorageShareLinkUrl(
  locationGuid: string,
  token: string,
): string {
  const params = new URLSearchParams({ [SHARE_LINK_TOKEN_PARAM]: token });
  return `${window.location.origin}${SHARED_STORAGE_PATH_PREFIX}/${locationGuid}?${params}`;
}
