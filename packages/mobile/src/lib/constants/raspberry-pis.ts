import type { PiHostScanStatusKey } from "@magic-vault/shared";
import type { PillProps } from "@/lib/interfaces/ui";

export const RASPBERRY_PIS_QUERY_KEY = "pi-hosts";
export const RASPBERRY_PI_LINK_ROUTE = "/settings/raspberry-pi-link";
export const PI_HOST_REQUEST_ACCEPTED_STATUSES = [400, 404, 409, 500, 503];

export const RASPBERRY_PI_STATUS_TONES: Record<PiHostScanStatusKey, NonNullable<PillProps["tone"]>> = {
  offline: "neutral",
  idle: "neutral",
  running: "success",
  paused: "warning",
  stopping: "info",
  error: "destructive",
};
export const RASPBERRY_PI_START_ROUTE = "/settings/raspberry-pi-scan";
export const RASPBERRY_PI_RENAME_ROUTE = "/settings/raspberry-pi-rename";
export const RASPBERRY_PI_CAMERA_PLACEHOLDER_HEIGHT = 180;
