import * as jose from "jose";
import { db } from "../db";
import { MONITOR_LINK_ISSUER } from "./constants/auth";
import type { MonitorLinkClaims } from "./interfaces/monitor-links";

const DAY_MS = 24 * 60 * 60 * 1000;

const openStreams = new Map<string, Set<() => void>>();

function monitorLinkSecret(): Uint8Array | null {
  const secret = process.env.MONITOR_LINK_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}

export function isMonitorLinkConfigured(): boolean {
  return monitorLinkSecret() !== null;
}

export async function signMonitorLink(
  collectionGuid: string,
  orgId: string,
  version: number,
  expiresInDays: number,
): Promise<{ token: string; expiresAt: Date }> {
  const secret = monitorLinkSecret();
  if (!secret) throw new Error("MONITOR_LINK_SECRET is not configured.");
  const expiresAt = new Date(Date.now() + expiresInDays * DAY_MS);
  const token = await new jose.SignJWT({ org: orgId, ver: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(MONITOR_LINK_ISSUER)
    .setSubject(collectionGuid)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);
  return { token, expiresAt };
}

export async function verifyMonitorLink(
  token: string,
): Promise<MonitorLinkClaims | null> {
  const secret = monitorLinkSecret();
  if (!secret) return null;
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: MONITOR_LINK_ISSUER,
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.org !== "string" ||
      typeof payload.ver !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    const collection = await db.query.collections.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.guid, payload.sub!),
          eq(t.orgId, payload.org as string),
          eq(t.isDeleted, false),
        ),
      columns: { name: true, monitorLinkVersion: true },
    });
    if (!collection || collection.monitorLinkVersion !== payload.ver) {
      return null;
    }
    return {
      collectionGuid: payload.sub,
      orgId: payload.org,
      collectionName: collection.name,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
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
