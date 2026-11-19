import { useSecondaryRequestsEnabled } from "@/lib/initial-load-context";
import { registerServiceWorker } from "@/lib/pwa";
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  const areSecondaryRequestsEnabled = useSecondaryRequestsEnabled();
  useEffect(() => {
    if (areSecondaryRequestsEnabled) registerServiceWorker();
  }, [areSecondaryRequestsEnabled]);
  return null;
}
