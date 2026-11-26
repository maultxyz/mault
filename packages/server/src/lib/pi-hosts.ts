import {
  PI_LINK_PAIRING_CODE_ALPHABET,
  PI_LINK_PAIRING_CODE_LENGTH,
  SORTER_LINK_CLOSE_REVOKED,
  type PiLinkPairingCreated,
  type PiLinkPairingPoll,
} from "@magic-vault/shared";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { db, type Transaction } from "../db";
import { devices, piHostPairings, piHosts } from "../db/schema";
import { resolveDeviceByHardwareId } from "./devices";
import { closeDeviceLink, generateSorterLinkToken, hashSorterLinkToken } from "./sorter-link";
import {
  PI_HOST_LAST_SEEN_WRITE_INTERVAL_MS,
  PI_HOST_LOOKUP_CACHE_MAX_ENTRIES,
  PI_HOST_LOOKUP_CACHE_TTL_MS,
  PI_HOST_TOKEN_BYTES,
  PI_HOST_TOKEN_PREFIX,
  PI_LINK_PAIRING_CODE_ATTEMPTS,
  PI_LINK_PAIRING_RETENTION_MS,
  PI_LINK_PAIRING_TTL_MS,
  PI_LINK_POLL_SECRET_BYTES,
} from "./constants/pi-hosts";
import type {
  PiHostClaimResult,
  PiHostTokenRecord,
  PiLinkPairingPollState,
  PiLinkPairingRow,
  PiSorterBridgeCredential,
  StoredPiHostSummary,
} from "./interfaces/pi-hosts";
import { createKeyedCache } from "./keyed-cache";
import { invalidateOrgReadCaches } from "./org-read-cache";

const piHostByTokenHashCache = createKeyedCache<PiHostTokenRecord | null>(
  "piHosts.byTokenHash",
  PI_HOST_LOOKUP_CACHE_TTL_MS,
  PI_HOST_LOOKUP_CACHE_MAX_ENTRIES,
);

export function hashPiLinkSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function secretMatchesHash(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPiLinkSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function generatePiPairingCode(): string {
  let code = "";
  for (let index = 0; index < PI_LINK_PAIRING_CODE_LENGTH; index++)
    code += PI_LINK_PAIRING_CODE_ALPHABET[randomInt(PI_LINK_PAIRING_CODE_ALPHABET.length)];
  return code;
}

export function generatePiHostToken(): string {
  return `${PI_HOST_TOKEN_PREFIX}${randomBytes(PI_HOST_TOKEN_BYTES).toString("base64url")}`;
}

export function piLinkPairingPollState(
  pairing: PiLinkPairingRow,
  now: Date,
): PiLinkPairingPollState {
  if (pairing.tokenDeliveredAt) return "expired";
  if (pairing.claimedAt && pairing.piHostId != null) {
    const deliverableUntil = pairing.claimedAt.getTime() + PI_LINK_PAIRING_TTL_MS;
    return now.getTime() < deliverableUntil ? "deliver" : "expired";
  }
  return now < pairing.expiresAt ? "pending" : "expired";
}

export async function createPiLinkPairing(hostName: string): Promise<PiLinkPairingCreated> {
  const now = new Date();
  await db
    .delete(piHostPairings)
    .where(lt(piHostPairings.expiresAt, new Date(now.getTime() - PI_LINK_PAIRING_RETENTION_MS)));
  const pollSecret = randomBytes(PI_LINK_POLL_SECRET_BYTES).toString("base64url");
  const expiresAt = new Date(now.getTime() + PI_LINK_PAIRING_TTL_MS);
  for (let attempt = 0; attempt < PI_LINK_PAIRING_CODE_ATTEMPTS; attempt++) {
    const code = generatePiPairingCode();
    const inserted = await db
      .insert(piHostPairings)
      .values({ code, pollSecretHash: hashPiLinkSecret(pollSecret), hostName, expiresAt })
      .onConflictDoNothing({ target: piHostPairings.code })
      .returning({ id: piHostPairings.id });
    if (inserted.length > 0) return { code, pollSecret, expiresAt: expiresAt.toISOString() };
  }
  throw new Error("Could not allocate a Pi pairing code.");
}

export async function pollPiLinkPairing(
  code: string,
  pollSecret: string,
): Promise<PiLinkPairingPoll | null> {
  return db.transaction(async (tx) => {
    const [pairing] = await tx
      .select()
      .from(piHostPairings)
      .where(eq(piHostPairings.code, code))
      .for("update")
      .limit(1);
    if (!pairing || !secretMatchesHash(pollSecret, pairing.pollSecretHash)) return null;
    const now = new Date();
    const state = piLinkPairingPollState(pairing, now);
    if (state === "pending") return { status: "pending", expiresAt: pairing.expiresAt.toISOString() };
    if (state === "expired") return { status: "expired" };
    const token = generatePiHostToken();
    const [host] = await tx
      .update(piHosts)
      .set({ tokenHash: hashPiLinkSecret(token), updatedAt: now })
      .where(and(eq(piHosts.id, pairing.piHostId!), isNull(piHosts.revokedAt)))
      .returning({ guid: piHosts.guid, orgId: piHosts.orgId, name: piHosts.name });
    await tx
      .update(piHostPairings)
      .set({ tokenDeliveredAt: now })
      .where(eq(piHostPairings.id, pairing.id));
    if (!host) return { status: "expired" };
    return { status: "claimed", token, orgId: host.orgId, hostGuid: host.guid, hostName: host.name };
  });
}

export async function claimPiLinkPairing(
  orgId: string,
  userId: string,
  code: string,
  name: string,
): Promise<PiHostClaimResult> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [pairing] = await tx
      .select({ id: piHostPairings.id })
      .from(piHostPairings)
      .where(
        and(
          eq(piHostPairings.code, code),
          isNull(piHostPairings.claimedAt),
          sql`${piHostPairings.expiresAt} > ${now}`,
        ),
      )
      .for("update")
      .limit(1);
    if (!pairing) return { ok: false, reason: "notFound" };
    const [host] = await tx
      .insert(piHosts)
      .values({ orgId, name, pairedBy: userId })
      .returning({ id: piHosts.id, guid: piHosts.guid });
    await tx
      .update(piHostPairings)
      .set({ claimedAt: now, piHostId: host.id })
      .where(eq(piHostPairings.id, pairing.id));
    return { ok: true, guid: host.guid };
  });
}

export async function listPiHosts(tx: Transaction, orgId: string): Promise<StoredPiHostSummary[]> {
  const rows = await tx
    .select({
      guid: piHosts.guid,
      name: piHosts.name,
      pairedAt: piHosts.pairedAt,
      lastSeenAt: piHosts.lastSeenAt,
    })
    .from(piHosts)
    .where(and(eq(piHosts.orgId, orgId), isNull(piHosts.revokedAt)))
    .orderBy(desc(piHosts.pairedAt));
  return rows.map((row) => ({
    guid: row.guid,
    name: row.name,
    pairedAt: row.pairedAt.toISOString(),
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
  }));
}

export async function findPiHostActiveScanUser(
  tx: Transaction,
  orgId: string,
  guid: string,
): Promise<{ activeScanUserId: string | null } | null> {
  const [row] = await tx
    .select({ activeScanUserId: piHosts.activeScanUserId })
    .from(piHosts)
    .where(and(eq(piHosts.orgId, orgId), eq(piHosts.guid, guid), isNull(piHosts.revokedAt)))
    .limit(1);
  return row ?? null;
}

export async function renamePiHost(
  tx: Transaction,
  orgId: string,
  guid: string,
  name: string,
): Promise<boolean> {
  const updated = await tx
    .update(piHosts)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(piHosts.orgId, orgId), eq(piHosts.guid, guid), isNull(piHosts.revokedAt)))
    .returning({ id: piHosts.id });
  forgetPiHostTokens(updated.map((row) => row.id));
  return updated.length > 0;
}

export async function revokePiHost(tx: Transaction, orgId: string, guid: string): Promise<boolean> {
  const now = new Date();
  const revoked = await tx
    .update(piHosts)
    .set({ revokedAt: now, tokenHash: null, activeScanUserId: null, updatedAt: now })
    .where(and(eq(piHosts.orgId, orgId), eq(piHosts.guid, guid), isNull(piHosts.revokedAt)))
    .returning({ id: piHosts.id });
  forgetPiHostTokens(revoked.map((row) => row.id));
  return revoked.length > 0;
}

function forgetPiHostTokens(hostIds: number[]) {
  if (hostIds.length > 0) piHostByTokenHashCache.clear();
}

export function findPiHostByToken(token: string): Promise<PiHostTokenRecord | null> {
  if (!token.startsWith(PI_HOST_TOKEN_PREFIX)) return Promise.resolve(null);
  const tokenHash = hashPiLinkSecret(token);
  return piHostByTokenHashCache.get(tokenHash, async () => {
    const [row] = await db
      .select({
        id: piHosts.id,
        guid: piHosts.guid,
        orgId: piHosts.orgId,
        name: piHosts.name,
        lastSeenAt: piHosts.lastSeenAt,
        activeScanUserId: piHosts.activeScanUserId,
      })
      .from(piHosts)
      .where(and(eq(piHosts.tokenHash, tokenHash), isNull(piHosts.revokedAt)))
      .limit(1);
    return row
      ? {
          id: row.id,
          hostGuid: row.guid,
          orgId: row.orgId,
          name: row.name,
          lastSeenAt: row.lastSeenAt,
          activeScanUserId: row.activeScanUserId,
        }
      : null;
  });
}

export async function setPiHostActiveScanUser(
  hostGuid: string,
  orgId: string,
  userId: string | null,
): Promise<void> {
  await db
    .update(piHosts)
    .set({ activeScanUserId: userId, activeScanStartedAt: userId ? new Date() : null })
    .where(and(eq(piHosts.guid, hostGuid), eq(piHosts.orgId, orgId), isNull(piHosts.revokedAt)));
  piHostByTokenHashCache.clear();
}

export async function notePiHostSeen(host: PiHostTokenRecord): Promise<void> {
  const now = new Date();
  if (host.lastSeenAt && now.getTime() - host.lastSeenAt.getTime() < PI_HOST_LAST_SEEN_WRITE_INTERVAL_MS)
    return;
  host.lastSeenAt = now;
  await db
    .update(piHosts)
    .set({ lastSeenAt: now })
    .where(and(eq(piHosts.id, host.id), isNull(piHosts.revokedAt)));
}

export async function purgePiHostsOfOrg(tx: Transaction, orgId: string): Promise<void> {
  const hosts = await tx
    .delete(piHosts)
    .where(eq(piHosts.orgId, orgId))
    .returning({ id: piHosts.id });
  const hostIds = hosts.map((row) => row.id);
  if (hostIds.length > 0)
    await tx.delete(piHostPairings).where(inArray(piHostPairings.piHostId, hostIds));
  forgetPiHostTokens(hostIds);
}

export async function issuePiSorterBridgeCredential(
  host: Pick<PiHostTokenRecord, "id" | "orgId">,
  hardwareId: string,
): Promise<PiSorterBridgeCredential | null> {
  const token = generateSorterLinkToken();
  const device = await db.transaction(async (tx) => {
    const [bound] = await tx
      .select({ sorterHardwareId: piHosts.sorterHardwareId })
      .from(piHosts)
      .where(and(eq(piHosts.id, host.id), isNull(piHosts.revokedAt)))
      .for("update")
      .limit(1);
    if (!bound || (bound.sorterHardwareId && bound.sorterHardwareId !== hardwareId)) return null;
    if (!bound.sorterHardwareId)
      await tx
        .update(piHosts)
        .set({ sorterHardwareId: hardwareId, updatedAt: new Date() })
        .where(eq(piHosts.id, host.id));
    const resolved = await resolveDeviceByHardwareId(tx, host.orgId, hardwareId);
    await tx
      .update(devices)
      .set({ sorterLinkTokenHash: hashSorterLinkToken(token), updatedAt: new Date() })
      .where(eq(devices.id, resolved.id));
    return resolved;
  });
  if (!device) return null;
  invalidateOrgReadCaches(host.orgId);
  closeDeviceLink(device.guid!, SORTER_LINK_CLOSE_REVOKED);
  return { token, deviceGuid: device.guid! };
}
