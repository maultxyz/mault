import { apiGet } from "@/lib/api/client";
import type {
  LocalSessionUser,
  LocalSessionSnapshot,
} from "@/lib/interfaces/auth";
import { useSyncExternalStore } from "react";
import { getLocalToken } from "./local-token";

const SIGNED_OUT_SNAPSHOT: LocalSessionSnapshot = {
  data: null,
  isPending: false,
};

let snapshot: LocalSessionSnapshot = {
  data: null,
  isPending: !!getLocalToken(),
};
const listeners = new Set<() => void>();

function set(next: LocalSessionSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function load() {
  const token = getLocalToken();
  if (!token) {
    set({ data: null, isPending: false });
    return;
  }
  try {
    const res = await apiGet<{ success: boolean; data?: LocalSessionUser }>(
      "/api/local-auth/session",
    );
    set({
      data: res.success && res.data ? { user: res.data } : null,
      isPending: false,
    });
  } catch {
    set({ data: null, isPending: false });
  }
}

if (getLocalToken()) load();

export function notifyLocalSessionChanged(): void {
  set({ data: null, isPending: !!getLocalToken() });
  load();
}

export function useLocalAuthSession(): LocalSessionSnapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => SIGNED_OUT_SNAPSHOT,
  );
}
