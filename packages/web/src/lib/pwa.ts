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
