import type { MemberSeatLock } from "@/lib/interfaces/billing";
import {
  MEMBER_SEAT_LIMIT_ERROR_CODE,
  type MemberSeatLimitErrorBody,
} from "@magic-vault/shared";
import { useSyncExternalStore } from "react";

let currentLock: MemberSeatLock | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMemberSeatLock(lock: MemberSeatLock) {
  if (currentLock?.orgId === lock.orgId && currentLock.limit === lock.limit) {
    return;
  }
  currentLock = lock;
  for (const listener of listeners) listener();
}

export function useMemberSeatLock(): MemberSeatLock | null {
  return useSyncExternalStore(subscribe, () => currentLock);
}

export async function readMemberSeatLimit(
  res: Response,
): Promise<number | null> {
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as Partial<MemberSeatLimitErrorBody> | null;
  if (body?.code !== MEMBER_SEAT_LIMIT_ERROR_CODE) return null;
  return typeof body.limit === "number" ? body.limit : null;
}
