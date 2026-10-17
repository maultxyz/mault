import { APP_VERSION_CHECK_INTERVAL_MS } from "@/lib/constants/timing";
import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  registerSW({
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
