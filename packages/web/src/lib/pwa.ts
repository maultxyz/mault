import { APP_VERSION_CHECK_INTERVAL_MS } from "@/lib/constants/timing";
import { registerSW } from "virtual:pwa-register";

let hasRegisteredServiceWorker = false;

export function registerServiceWorker() {
  if (hasRegisteredServiceWorker) return;
  hasRegisteredServiceWorker = true;
  registerSW({
    onNeedReload() {},
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        if (!navigator.onLine) return;
        registration.update().catch(() => {});
      }, APP_VERSION_CHECK_INTERVAL_MS);
    },
  });
}
