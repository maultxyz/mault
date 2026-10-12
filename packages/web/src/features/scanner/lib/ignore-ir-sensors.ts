import { useRole } from "@/hooks/use-role";
import { IGNORE_IR_SENSORS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function getIgnoreIrSensors(): boolean {
  try {
    return localStorage.getItem(IGNORE_IR_SENSORS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setIgnoreIrSensors(value: boolean): void {
  try {
    if (value) localStorage.setItem(IGNORE_IR_SENSORS_STORAGE_KEY, "true");
    else localStorage.removeItem(IGNORE_IR_SENSORS_STORAGE_KEY);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIgnoreIrSensors() {
  const { isAdmin } = useRole();
  const stored = useSyncExternalStore(subscribe, getIgnoreIrSensors);
  return [isAdmin && stored, setIgnoreIrSensors] as const;
}
