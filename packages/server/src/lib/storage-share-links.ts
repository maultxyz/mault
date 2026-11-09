import { db } from "../db";
import { STORAGE_SHARE_LINK_ISSUER } from "./constants/auth";
import type { StorageShareLinkClaims } from "./interfaces/share-tokens";
import { signShareToken, verifyShareToken } from "./share-tokens";

export function signStorageShareLink(
  locationGuid: string,
  orgId: string,
  version: number,
  expiresInDays: number,
  showsPrices: boolean,
) {
  return signShareToken({
    issuer: STORAGE_SHARE_LINK_ISSUER,
    subjectGuid: locationGuid,
    orgId,
    version,
    expiresInDays,
    showsPrices,
  });
}

export async function verifyStorageShareLink(
  token: string,
): Promise<StorageShareLinkClaims | null> {
  const verified = await verifyShareToken(STORAGE_SHARE_LINK_ISSUER, token);
  if (!verified) return null;
  const location = await db.query.storageLocations.findFirst({
    where: (t, { eq, and }) =>
      and(
        eq(t.guid, verified.subjectGuid),
        eq(t.orgId, verified.orgId),
        eq(t.isDeleted, false),
      ),
    columns: { id: true, name: true, shareLinkVersion: true },
  });
  if (!location || location.shareLinkVersion !== verified.version) return null;
  return {
    locationGuid: verified.subjectGuid,
    locationId: location.id,
    orgId: verified.orgId,
    locationName: location.name,
    expiresAt: verified.expiresAt,
    showsPrices: verified.showsPrices,
  };
}
