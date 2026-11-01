import { publicGet } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import { LATEST_FIRMWARE_VERSION } from "@/lib/constants/firmware";
import {
  ESP32_FIRMWARE_URL,
  FIRMWARE_RELEASES_API_PATH,
} from "@/lib/constants/links";
import type { FirmwareOption } from "@/lib/interfaces/scanner";
import type { FirmwareRelease, Result } from "@magic-vault/shared";
import { useEffect, useMemo, useState } from "react";

export function useFirmwareOptions(shouldLoadReleases: boolean) {
  const [releases, setReleases] = useState<FirmwareRelease[]>([]);

  useEffect(() => {
    if (!shouldLoadReleases) return;
    let cancelled = false;
    publicGet<Result<FirmwareRelease[]>>(FIRMWARE_RELEASES_API_PATH)
      .then((res) => {
        if (!cancelled) setReleases(res.data ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [shouldLoadReleases]);

  return useMemo<FirmwareOption[]>(
    () => [
      {
        version: LATEST_FIRMWARE_VERSION,
        firmwareUrl: ESP32_FIRMWARE_URL,
        isBundled: true,
      },
      ...releases
        .filter((release) => release.version !== LATEST_FIRMWARE_VERSION)
        .map((release) => ({
          version: release.version,
          firmwareUrl: `${API_BASE}${FIRMWARE_RELEASES_API_PATH}/${encodeURIComponent(release.version)}/esp32.bin`,
          isBundled: false,
        })),
    ],
    [releases],
  );
}
