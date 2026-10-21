import { EMPTY_CHECKLIST } from "@/lib/constants/guide";
import type { ChecklistStore } from "@/lib/interfaces/guide";

export function createChecklistStore(storageKey: string): ChecklistStore {
  let state: Record<string, boolean> | null = null;
  const listeners = new Set<() => void>();

  const getSnapshot = () => {
    if (state) return state;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      state =
        parsed && typeof parsed === "object"
          ? (parsed as Record<string, boolean>)
          : EMPTY_CHECKLIST;
    } catch {
      state = EMPTY_CHECKLIST;
    }
    return state;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const toggle = (key: string) => {
    const current = getSnapshot();
    state = { ...current, [key]: !current[key] };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
    listeners.forEach((listener) => listener());
  };

  const check = (keys: readonly string[]) => {
    const current = getSnapshot();
    state = { ...current, ...Object.fromEntries(keys.map((key) => [key, true])) };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
    listeners.forEach((listener) => listener());
  };

  return { subscribe, getSnapshot, toggle, check };
}
