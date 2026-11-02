import { useSyncExternalStore } from "react";
import type { MemberSeatLock } from "@/lib/interfaces/api";

let memberSeatLock: MemberSeatLock | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setMemberSeatLock(next: MemberSeatLock | null): void {
  memberSeatLock = next;
  for (const listener of listeners) listener();
}

export function lockOrgForMemberSeatLimit(lock: MemberSeatLock): void {
  if (memberSeatLock?.orgId === lock.orgId && memberSeatLock.limit === lock.limit) return;
  setMemberSeatLock(lock);
}

export function clearMemberSeatLock(orgId: string | null): void {
  if (memberSeatLock && memberSeatLock.orgId === orgId) setMemberSeatLock(null);
}

export function useMemberSeatLock(orgId: string | null): MemberSeatLock | null {
  const lock = useSyncExternalStore(subscribe, () => memberSeatLock);
  return lock && lock.orgId === orgId ? lock : null;
}
