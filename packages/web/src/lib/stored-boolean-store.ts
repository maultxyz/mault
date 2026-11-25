import { useSyncExternalStore } from "react";

export function createStoredBooleanStore(storageKey: string, defaultValue: boolean) {
  const listeners = new Set<() => void>();

  const readStored = (): boolean => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? defaultValue : stored === "true";
    } catch {
      return defaultValue;
    }
  };

  let value = readStored();

  const get = (): boolean => value;
  const getOnServer = (): boolean => defaultValue;

  const set = (nextValue: boolean): void => {
    value = nextValue;
    try {
      if (nextValue === defaultValue) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, String(nextValue));
    } catch {}
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const useValue = (): boolean => useSyncExternalStore(subscribe, get, getOnServer);

  return { get, set, useValue };
}
