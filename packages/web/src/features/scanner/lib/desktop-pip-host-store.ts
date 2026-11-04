import type { DesktopPipHostSnapshot } from "@/lib/interfaces/scanner";
import { useSyncExternalStore } from "react";

let snapshot: DesktopPipHostSnapshot = { container: null, hasContent: false };
let registeredContentCount = 0;
let dismissDesktopPipWindow: () => void = () => {};
const hostListeners = new Set<() => void>();

function updateSnapshot(next: DesktopPipHostSnapshot): void {
  if (
    next.container === snapshot.container &&
    next.hasContent === snapshot.hasContent
  ) {
    return;
  }
  snapshot = next;
  hostListeners.forEach((listener) => listener());
}

export function setDesktopPipContainer(container: HTMLElement | null): void {
  updateSnapshot({ ...snapshot, container });
}

export function setDesktopPipDismiss(dismiss: () => void): void {
  dismissDesktopPipWindow = dismiss;
}

export function dismissDesktopPip(): void {
  dismissDesktopPipWindow();
}

export function registerDesktopPipContent(): () => void {
  registeredContentCount++;
  updateSnapshot({ ...snapshot, hasContent: true });
  return () => {
    registeredContentCount--;
    updateSnapshot({ ...snapshot, hasContent: registeredContentCount > 0 });
  };
}

function subscribeDesktopPipHost(listener: () => void) {
  hostListeners.add(listener);
  return () => {
    hostListeners.delete(listener);
  };
}

function getDesktopPipHostSnapshot() {
  return snapshot;
}

export function useDesktopPipHost(): DesktopPipHostSnapshot {
  return useSyncExternalStore(subscribeDesktopPipHost, getDesktopPipHostSnapshot);
}
