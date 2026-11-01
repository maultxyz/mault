import {
  getLatestFirmwareVersion,
  subscribeLatestFirmwareVersion,
} from "@/lib/latest-firmware-version";
import { loadServerVersion } from "@/lib/server-version";
import { useEffect, useSyncExternalStore } from "react";

export function useLatestFirmwareVersion(): string | null {
  useEffect(() => {
    void loadServerVersion();
  }, []);
  return useSyncExternalStore(
    subscribeLatestFirmwareVersion,
    getLatestFirmwareVersion,
  );
}
