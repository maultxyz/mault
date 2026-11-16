import type { GlobalSearchState } from "@/lib/interfaces/search";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const closedGlobalSearchState: GlobalSearchState = { isOpen: false, initialQuery: "" };
let globalSearchState: GlobalSearchState = closedGlobalSearchState;

function setGlobalSearchState(nextState: GlobalSearchState): void {
  globalSearchState = nextState;
  listeners.forEach((listener) => listener());
}

export function openGlobalSearch(initialQuery = ""): void {
  setGlobalSearchState({ isOpen: true, initialQuery });
}

export function closeGlobalSearch(): void {
  if (!globalSearchState.isOpen) return;
  setGlobalSearchState({ ...globalSearchState, isOpen: false });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readGlobalSearchState(): GlobalSearchState {
  return globalSearchState;
}

function readServerGlobalSearchState(): GlobalSearchState {
  return closedGlobalSearchState;
}

export function useGlobalSearchState(): GlobalSearchState {
  return useSyncExternalStore(subscribe, readGlobalSearchState, readServerGlobalSearchState);
}
