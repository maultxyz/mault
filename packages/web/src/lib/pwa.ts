import {
  STALE_CHUNK_ERROR_PATTERN,
  STALE_CHUNK_RELOAD_AT_KEY,
  STALE_CHUNK_RELOAD_GUARD_MS,
} from "@/lib/constants/pwa";
import { APP_VERSION_CHECK_INTERVAL_MS } from "@/lib/constants/timing";
import { registerSW } from "virtual:pwa-register";

export function isStaleChunkError(error: unknown) {
  return (
    error instanceof Error && STALE_CHUNK_ERROR_PATTERN.test(error.message)
  );
}

export function reloadOnceForStaleChunks() {
  try {
    const lastReloadAt = Number(
      sessionStorage.getItem(STALE_CHUNK_RELOAD_AT_KEY),
    );
    if (Date.now() - lastReloadAt < STALE_CHUNK_RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(STALE_CHUNK_RELOAD_AT_KEY, String(Date.now()));
  } catch {
    return false;
  }
  void hardReload();
  return true;
}

export function registerServiceWorker() {
  registerSW({
    onNeedReload() {},
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => registration.update(), APP_VERSION_CHECK_INTERVAL_MS);
    },
  });
}

export async function hardReload() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    window.location.reload();
  }
}
