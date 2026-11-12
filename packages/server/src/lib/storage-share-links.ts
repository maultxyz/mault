import type { ShareLinkPurpose } from "@magic-vault/shared";
import { db } from "../db";
import { STORAGE_SHARE_LINK_ISSUER } from "./constants/auth";
import type { StorageShareLinkClaims } from "./interfaces/share-tokens";
import {
  SHARE_LINK_CACHE_MAX_ENTRIES,
  SHARE_LINK_CLAIMS_CACHE_TTL_MS,
} from "./constants/api-keys";
import { shareLinkLifetime } from "./share-link-policy";
import { signShareToken, verifyShareToken } from "./share-tokens";
import { createTtlCache } from "./ttl-cache";

const verifiedStorageShareLinks = createTtlCache<StorageShareLinkClaims>({
  ttlMs: SHARE_LINK_CLAIMS_CACHE_TTL_MS,
  maxEntries: SHARE_LINK_CACHE_MAX_ENTRIES,
});

export function signStorageShareLink(
  locationGuid: string,
  orgId: string,
  version: number,
  expiresInMinutes: number,
  showsPrices: boolean,
  purpose: ShareLinkPurpose,
) {
  return signShareToken({
    issuer: STORAGE_SHARE_LINK_ISSUER,
    subjectGuid: locationGuid,
    orgId,
    version,
    expiresInMinutes,
    showsPrices,
    purpose,
  });
}

export async function verifyStorageShareLink(
  token: string,
): Promise<StorageShareLinkClaims | null> {
  const cached = verifiedStorageShareLinks.get(token);
  if (cached && cached.expiresAt.getTime() > Date.now()) return cached;
  const claims = await loadStorageShareLinkClaims(token);
  if (claims) verifiedStorageShareLinks.set(token, claims);
  return claims;
}

export function forgetVerifiedStorageShareLinks(locationGuid: string): void {
  verifiedStorageShareLinks.deleteWhere(
    (token) => verifiedStorageShareLinks.get(token)?.locationGuid === locationGuid,
  );
}

async function loadStorageShareLinkClaims(
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
  const lifetime = await shareLinkLifetime(
    verified.orgId,
    verified.purpose,
    verified.issuedAt,
    verified.expiresAt,
  );
  if (!lifetime) return null;
  return {
    locationGuid: verified.subjectGuid,
    locationId: location.id,
    orgId: verified.orgId,
    locationName: location.name,
    expiresAt: lifetime.expiresAt,
    showsPrices: verified.showsPrices,
    purpose: verified.purpose,
  };
}
