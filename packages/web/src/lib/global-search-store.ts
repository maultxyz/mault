import type { GlobalSearchState } from "@/lib/interfaces/search";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const closedGlobalSearchState: GlobalSearchState = { isOpen: false, initialQuery: "", selectedGameKey: null };
let globalSearchState: GlobalSearchState = closedGlobalSearchState;

function setGlobalSearchState(nextState: GlobalSearchState): void {
  globalSearchState = nextState;
  listeners.forEach((listener) => listener());
}

export function openGlobalSearch(initialQuery = ""): void {
  setGlobalSearchState({ ...globalSearchState, isOpen: true, initialQuery });
}

export function selectGlobalSearchGame(selectedGameKey: string | null): void {
  if (globalSearchState.selectedGameKey === selectedGameKey) return;
  setGlobalSearchState({ ...globalSearchState, selectedGameKey });
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
