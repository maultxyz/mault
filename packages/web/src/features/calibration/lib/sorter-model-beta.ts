import { SORTER_MODEL_BETA_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function getSorterModelBeta(): boolean {
  try {
    return localStorage.getItem(SORTER_MODEL_BETA_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setSorterModelBeta(value: boolean): void {
  try {
    if (value) localStorage.setItem(SORTER_MODEL_BETA_STORAGE_KEY, "true");
    else localStorage.removeItem(SORTER_MODEL_BETA_STORAGE_KEY);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSorterModelBeta() {
  const enabled = useSyncExternalStore(subscribe, getSorterModelBeta);
  return [enabled, setSorterModelBeta] as const;
}
