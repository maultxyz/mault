import { apiGet } from "@/lib/api/client";
import { useSyncExternalStore } from "react";
import { getLocalToken } from "./local-token";

export interface LocalSessionUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface LocalSessionSnapshot {
  data: { user: LocalSessionUser } | null;
  isPending: boolean;
}

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

// Called after sign-in/sign-up stores a new token, and after sign-out clears
// one - re-fetches /local-auth/session so every useLocalAuthSession()
// subscriber (see below) re-renders with the new state.
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
  );
}
