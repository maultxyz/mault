import { useCallback, useState } from "react";

function readStoredValue(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function usePersistedState<T extends string>(
  storageKey: string,
  parseStoredValue: (stored: string | null) => T,
) {
  const [value, setValue] = useState<T>(() =>
    parseStoredValue(readStoredValue(storageKey)),
  );
  const setAndPersistValue = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {}
    },
    [storageKey],
  );
  return [value, setAndPersistValue] as const;
}

function parseStoredFlag(stored: string | null): "true" | "false" {
  return stored === "true" || stored === "1" ? "true" : "false";
}

export function usePersistedFlag(storageKey: string) {
  const [stored, setStored] = usePersistedState(storageKey, parseStoredFlag);
  const setEnabled = useCallback(
    (enabled: boolean) => setStored(enabled ? "true" : "false"),
    [setStored],
  );
  return [stored === "true", setEnabled] as const;
}
