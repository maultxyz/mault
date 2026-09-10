import { apiGet } from "@/lib/api/client";
import { APP_VERSION_CHECK_INTERVAL_MS as CHECK_INTERVAL_MS } from "@/lib/constants/timing";
import { useEffect, useState } from "react";

interface VersionResponse {
  success: boolean;
  data: { version: string };
}

export function useAppVersionCheck() {
  const [isOutdated, setIsOutdated] = useState(false);

  useEffect(() => {
    if (isOutdated) return;
    let cancelled = false;

    async function check() {
      try {
        const res = await apiGet<VersionResponse>("/api/public/version");
        if (!cancelled && res.data.version !== __APP_VERSION__) {
          setIsOutdated(true);
        }
      } catch {}
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOutdated]);

  return isOutdated;
}
