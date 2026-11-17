import { useSyncExternalStore } from "react";

let currentAnnouncement = "";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function announcePolitely(message: string) {
  currentAnnouncement =
    message === currentAnnouncement.trimEnd()
      ? `${message} `
      : message;
  for (const listener of listeners) listener();
}

export function useLiveAnnouncement(): string {
  return useSyncExternalStore(subscribe, () => currentAnnouncement);
}
