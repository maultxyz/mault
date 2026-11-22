import { notePiHost } from "@/lib/pi-host";
import { APP_VERSION_CHECK_INTERVAL_MS as CHECK_INTERVAL_MS } from "@/lib/constants/timing";
import type { AppVersionResponse } from "@/lib/interfaces/nav";
import { getLatestFirmwareVersion } from "@/lib/latest-firmware-version";
import { fetchServerVersion, loadServerVersion } from "@/lib/server-version";
import { useEffect, useState } from "react";

export function useAppVersionCheck() {
  const [isOutdated, setIsOutdated] = useState(false);

  useEffect(() => {
    if (isOutdated) return;
    let cancelled = false;

    async function check(
      serverVersionRequest: Promise<AppVersionResponse["data"] | null>,
    ) {
      try {
        const serverVersion = await serverVersionRequest;
        if (!serverVersion) return;
        notePiHost(serverVersion.piHost === true, serverVersion.piSorter === true);
        const firmwareChanged =
          (serverVersion.latestFirmwareVersion ?? null) !==
          getLatestFirmwareVersion();
        if (
          !cancelled &&
          (serverVersion.version !== __APP_VERSION__ || firmwareChanged)
        ) {
          setIsOutdated(true);
        }
      } catch {}
    }

    void check(loadServerVersion());
    const interval = setInterval(
      () => void check(fetchServerVersion()),
      CHECK_INTERVAL_MS,
    );
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOutdated]);

  return isOutdated;
}
