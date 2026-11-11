import {
  SHARED_STORAGE_PATH_PREFIX,
  SHARE_LINK_TOKEN_PARAM,
  type Result,
  type ShareLinkPurpose,
  type StorageShareLink,
} from "@magic-vault/shared";
import { apiPost, unwrap } from "@/lib/api/client";
import { WEB_URL } from "@/lib/constants/config";

export function createStorageShareLink(
  locationGuid: string,
  expiresInDays: number,
  showPrices: boolean,
  purpose: ShareLinkPurpose,
): Promise<StorageShareLink> {
  return unwrap(
    apiPost<Result<StorageShareLink>>(`/api/storage-locations/${locationGuid}/share-link`, {
      expiresInDays,
      showPrices,
      purpose,
    }),
  );
}

export function revokeStorageShareLinks(locationGuid: string): Promise<unknown> {
  return unwrap(apiPost<Result<unknown>>(`/api/storage-locations/${locationGuid}/share-link/revoke`));
}

export function buildStorageShareLinkUrl(locationGuid: string, token: string): string {
  return `${WEB_URL}${SHARED_STORAGE_PATH_PREFIX}/${locationGuid}?${SHARE_LINK_TOKEN_PARAM}=${encodeURIComponent(token)}`;
}
