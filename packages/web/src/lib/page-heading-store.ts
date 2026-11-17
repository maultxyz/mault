import { useSyncExternalStore } from "react";

let currentPageHeading = "";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPageHeading(pageHeading: string) {
  if (pageHeading === currentPageHeading) return;
  currentPageHeading = pageHeading;
  for (const listener of listeners) listener();
}

export function usePageHeading(): string {
  return useSyncExternalStore(subscribe, () => currentPageHeading);
}
