import {
  type Result,
  type ShareLinkPurpose,
  type StorageShareLink,
} from "@magic-vault/shared";
import { apiPost, unwrap } from "@/lib/api/client";

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

