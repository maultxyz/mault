import { db } from "../db";
import { MONITOR_LINK_ISSUER } from "./constants/auth";
import type { MonitorLinkClaims } from "./interfaces/monitor-links";
import {
  SHARE_LINK_CACHE_MAX_ENTRIES,
  SHARE_LINK_CLAIMS_CACHE_TTL_MS,
} from "./constants/api-keys";
import { signShareToken, verifyShareToken } from "./share-tokens";
import { createTtlCache } from "./ttl-cache";

const verifiedMonitorLinks = createTtlCache<MonitorLinkClaims>({
  ttlMs: SHARE_LINK_CLAIMS_CACHE_TTL_MS,
  maxEntries: SHARE_LINK_CACHE_MAX_ENTRIES,
});

const openStreams = new Map<string, Set<() => void>>();

export function signMonitorLink(
  collectionGuid: string,
  orgId: string,
  version: number,
  expiresInDays: number,
  showsPrices: boolean,
) {
  return signShareToken({
    issuer: MONITOR_LINK_ISSUER,
    subjectGuid: collectionGuid,
    orgId,
    version,
    expiresInDays,
    showsPrices,
  });
}

export async function verifyMonitorLink(
  token: string,
): Promise<MonitorLinkClaims | null> {
  const cached = verifiedMonitorLinks.get(token);
  if (cached) return cached;
  const claims = await loadMonitorLinkClaims(token);
  if (claims) verifiedMonitorLinks.set(token, claims);
  return claims;
}

export function forgetVerifiedMonitorLinks(collectionGuid: string): void {
  verifiedMonitorLinks.deleteWhere(
    (token) => verifiedMonitorLinks.get(token)?.collectionGuid === collectionGuid,
  );
}

async function loadMonitorLinkClaims(
  token: string,
): Promise<MonitorLinkClaims | null> {
  const verified = await verifyShareToken(MONITOR_LINK_ISSUER, token);
  if (!verified) return null;
  const collection = await db.query.collections.findFirst({
    where: (t, { eq, and }) =>
      and(
        eq(t.guid, verified.subjectGuid),
        eq(t.orgId, verified.orgId),
        eq(t.isDeleted, false),
      ),
    columns: { name: true, monitorLinkVersion: true },
  });
  if (!collection || collection.monitorLinkVersion !== verified.version) {
    return null;
  }
  return {
    collectionGuid: verified.subjectGuid,
    orgId: verified.orgId,
    collectionName: collection.name,
    expiresAt: verified.expiresAt,
    showsPrices: verified.showsPrices,
  };
}

export function trackMonitorLinkStream(
  collectionGuid: string,
  close: () => void,
): () => void {
  let closers = openStreams.get(collectionGuid);
  if (!closers) {
    closers = new Set();
    openStreams.set(collectionGuid, closers);
  }
  closers.add(close);
  return () => {
    closers!.delete(close);
    if (closers!.size === 0) openStreams.delete(collectionGuid);
  };
}

export function closeMonitorLinkStreams(collectionGuid: string): void {
  const closers = openStreams.get(collectionGuid);
  if (!closers) return;
  for (const close of Array.from(closers)) close();
}
