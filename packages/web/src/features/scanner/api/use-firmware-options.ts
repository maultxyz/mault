import { publicGet } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import { useLatestFirmwareVersion } from "@/hooks/use-latest-firmware-version";
import { BUNDLED_FIRMWARE_OPTION_KEY } from "@/lib/constants/firmware";
import {
  ESP32_FIRMWARE_URL,
  FIRMWARE_RELEASES_API_PATH,
} from "@/lib/constants/links";
import type { FirmwareOption } from "@/lib/interfaces/scanner";
import type { FirmwareRelease, Result } from "@magic-vault/shared";
import { useEffect, useMemo, useState } from "react";

export function useFirmwareOptions(shouldLoadReleases: boolean) {
  const latestFirmwareVersion = useLatestFirmwareVersion();
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
        key: BUNDLED_FIRMWARE_OPTION_KEY,
        version: latestFirmwareVersion,
        firmwareUrl: ESP32_FIRMWARE_URL,
        isBundled: true,
      },
      ...releases
        .filter((release) => release.version !== latestFirmwareVersion)
        .map((release) => ({
          key: release.version,
          version: release.version,
          firmwareUrl: `${API_BASE}${FIRMWARE_RELEASES_API_PATH}/${encodeURIComponent(release.version)}/esp32.bin`,
          isBundled: false,
        })),
    ],
    [latestFirmwareVersion, releases],
  );
}
