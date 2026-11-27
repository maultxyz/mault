import { useSyncExternalStore } from "react";
import type { StoredFlagOptions } from "@/lib/interfaces/stored-flag";

export function createStoredFlag(
  storageKey: string,
  { isEnabledByDefault = false }: StoredFlagOptions = {},
) {
  const listeners = new Set<() => void>();

  const read = (): boolean => {
    try {
      const stored = localStorage.getItem(storageKey);
      return isEnabledByDefault ? stored !== "false" : stored === "true";
    } catch {
      return isEnabledByDefault;
    }
  };

  const write = (value: boolean): void => {
    try {
      if (value === isEnabledByDefault) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, value ? "true" : "false");
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
