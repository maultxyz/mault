import { FORCE_CPU_VECTORIZE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

export function getForceCpuVectorize(): boolean {
  try {
    return localStorage.getItem(FORCE_CPU_VECTORIZE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setForceCpuVectorize(value: boolean): void {
  try {
    localStorage.setItem(FORCE_CPU_VECTORIZE_STORAGE_KEY, String(value));
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useForceCpuVectorize() {
  const forceCpu = useSyncExternalStore(subscribe, getForceCpuVectorize);
  return [forceCpu, setForceCpuVectorize] as const;
}
