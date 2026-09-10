import { eq } from "drizzle-orm";
import { db } from "../db";
import { orgSettings } from "../db/schema";
import { SCAN_LOCK_TTL_MS as LOCK_TTL_MS } from "./constants/timing";

export interface ScanLock {
  userId: string;
  displayName: string;
  expiresAt: number;
}

export interface AcquireLockResult {
  ok: boolean;
  isNewSession: boolean;
}

type LockWriter = (event: string, data: unknown) => void;

interface LockEntry extends ScanLock {
  orgId: string;
  timer: ReturnType<typeof setTimeout>;
}

const locks = new Map<string, LockEntry>();
const orgWriters = new Map<string, Set<LockWriter>>();

function emitToOrg(orgId: string, event: string, data: unknown) {
  const writers = orgWriters.get(orgId);
  if (!writers) return;
  for (const writer of writers) {
    try {
      writer(event, data);
    } catch {
      /* writer disconnected */
    }
  }
}

async function clearScanThread(orgId: string) {
  try {
    await db
      .update(orgSettings)
      .set({ discordScanThreadId: null, updatedAt: new Date() })
      .where(eq(orgSettings.orgId, orgId));
  } catch (err) {
    console.error("[scan-lock] Failed to clear scan thread:", err);
  }
}

function scheduleLockExpiry(guid: string): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    const entry = locks.get(guid);
    if (entry) {
      emitToOrg(entry.orgId, "lock_released", { guid });
      locks.delete(guid);
      void clearScanThread(entry.orgId);
    }
  }, LOCK_TTL_MS);
}

export function acquireLock(
  guid: string,
  userId: string,
  orgId: string,
  displayName: string,
): AcquireLockResult {
  const existing = locks.get(guid);
  if (existing) {
    if (existing.userId !== userId) return { ok: false, isNewSession: false };
    clearTimeout(existing.timer);
    existing.timer = scheduleLockExpiry(guid);
    existing.expiresAt = Date.now() + LOCK_TTL_MS;
    return { ok: true, isNewSession: false };
  }
  locks.set(guid, {
    userId,
    displayName,
    orgId,
    expiresAt: Date.now() + LOCK_TTL_MS,
    timer: scheduleLockExpiry(guid),
  });
  emitToOrg(orgId, "lock_acquired", { guid, userId, displayName });
  return { ok: true, isNewSession: true };
}

export function releaseLock(guid: string, userId: string): boolean {
  const existing = locks.get(guid);
  if (!existing || existing.userId !== userId) return false;
  clearTimeout(existing.timer);
  emitToOrg(existing.orgId, "lock_released", { guid });
  locks.delete(guid);
  void clearScanThread(existing.orgId);
  return true;
}

export function getLock(guid: string): ScanLock | null {
  const entry = locks.get(guid);
  if (!entry) return null;
  return {
    userId: entry.userId,
    displayName: entry.displayName,
    expiresAt: entry.expiresAt,
  };
}

export function getLocksForGuids(guids: string[]): Record<string, ScanLock> {
  const result: Record<string, ScanLock> = {};
  for (const guid of guids) {
    const entry = locks.get(guid);
    if (entry)
      result[guid] = {
        userId: entry.userId,
        displayName: entry.displayName,
        expiresAt: entry.expiresAt,
      };
  }
  return result;
}

export function subscribeOrgLocks(
  orgId: string,
  writer: LockWriter,
): () => void {
  let writers = orgWriters.get(orgId);
  if (!writers) {
    writers = new Set();
    orgWriters.set(orgId, writers);
  }
  writers.add(writer);
  return () => {
    writers!.delete(writer);
    if (writers!.size === 0) orgWriters.delete(orgId);
  };
}
