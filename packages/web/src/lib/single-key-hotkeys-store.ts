import { SINGLE_KEY_HOTKEYS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function readStoredSingleKeyHotkeysEnabled(): boolean {
  try {
    return localStorage.getItem(SINGLE_KEY_HOTKEYS_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

let singleKeyHotkeysEnabled = readStoredSingleKeyHotkeysEnabled();

export function areSingleKeyHotkeysEnabled(): boolean {
  return singleKeyHotkeysEnabled;
}

function singleKeyHotkeysEnabledOnServer(): boolean {
  return true;
}

export function setSingleKeyHotkeysEnabled(enabled: boolean): void {
  singleKeyHotkeysEnabled = enabled;
  try {
    if (enabled) localStorage.removeItem(SINGLE_KEY_HOTKEYS_STORAGE_KEY);
    else localStorage.setItem(SINGLE_KEY_HOTKEYS_STORAGE_KEY, "false");
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSingleKeyHotkeysEnabled(): boolean {
  return useSyncExternalStore(subscribe, areSingleKeyHotkeysEnabled, singleKeyHotkeysEnabledOnServer);
}
