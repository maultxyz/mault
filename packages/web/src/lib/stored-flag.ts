import { useSyncExternalStore } from "react";

export function createStoredFlag(storageKey: string) {
  const listeners = new Set<() => void>();

  const read = (): boolean => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  };

  const write = (value: boolean): void => {
    try {
      if (value) localStorage.setItem(storageKey, "true");
      else localStorage.removeItem(storageKey);
    } catch {}
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return function useStoredFlag() {
    const enabled = useSyncExternalStore(subscribe, read);
    return [enabled, write] as const;
  };
}
