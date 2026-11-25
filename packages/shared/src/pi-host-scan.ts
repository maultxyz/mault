import {
  PI_HOST_CAMERA_CLOSE_REFRESH,
  PI_HOST_CAMERA_MAX_FAILED_CONNECTS,
  PI_HOST_CAMERA_RECONNECT_MAX_MS,
  PI_HOST_CAMERA_RECONNECT_MIN_MS,
  PI_HOST_CAMERA_SEGMENT,
  PI_HOST_SCAN_SESSION_SEGMENT,
  PI_HOSTS_PATH,
} from "./constants/pi-link.constant";
import type { PiHostScanStartFormValues } from "./schemas/forms.schema";
import type { PiScanSessionStartBody } from "./interfaces/pi-scan.interface";
import type {
  PiHostScanSessionSubpath,
  PiHostScanControls,
  PiHostStatusEvent,
  PiHostSummary,
} from "./interfaces/pi-link.interface";

export function parseSetCodeList(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,]+/)
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

export function piHostScanStartBody(values: PiHostScanStartFormValues): PiScanSessionStartBody {
  return {
    collectionGuid: values.collectionGuid,
    condition: values.condition,
    foilType: values.foilType || null,
    preferredSetCodes: parseSetCodeList(values.preferredSetCodes),
    autoFeed: values.autoFeed,
    allowDuplicates: values.allowDuplicates,
  };
}

export function piHostScanSessionPath(hostGuid: string, action?: PiHostScanSessionSubpath): string {
  const base = `${PI_HOSTS_PATH}/${encodeURIComponent(hostGuid)}${PI_HOST_SCAN_SESSION_SEGMENT}`;
  return action ? `${base}/${action}` : base;
}

export function piHostCameraPath(hostGuid: string): string {
  return `${PI_HOSTS_PATH}/${encodeURIComponent(hostGuid)}${PI_HOST_CAMERA_SEGMENT}`;
}

export function piHostCameraReconnectDelayMs(closeCode: number, failedConnects: number): number | null {
  if (closeCode === PI_HOST_CAMERA_CLOSE_REFRESH) return 0;
  if (failedConnects >= PI_HOST_CAMERA_MAX_FAILED_CONNECTS) return null;
  return Math.min(
    PI_HOST_CAMERA_RECONNECT_MIN_MS * 2 ** Math.max(failedConnects - 1, 0),
    PI_HOST_CAMERA_RECONNECT_MAX_MS,
  );
}

export function applyPiHostStatusEvent(
  hosts: PiHostSummary[],
  event: PiHostStatusEvent,
): PiHostSummary[] {
  return hosts.map((host) =>
    host.guid === event.hostGuid
      ? { ...host, connected: event.connected, scanState: event.scanState }
      : host,
  );
}

export function piHostScanControls(host: Pick<PiHostSummary, "connected" | "scanState">): PiHostScanControls {
  const state = host.scanState;
  if (!host.connected)
    return {
      statusKey: "offline",
      canStart: false,
      canPause: false,
      canResume: false,
      canStop: false,
      canEmergencyStop: false,
    };
  const isActive = state?.phase === "running" || state?.phase === "paused";
  const statusKey = state?.stopping
    ? "stopping"
    : state?.phase === "running" || state?.phase === "paused" || state?.phase === "error"
      ? state.phase
      : "idle";
  return {
    statusKey,
    canStart: !isActive && !state?.stopping,
    canPause: state?.phase === "running" && !state.stopping,
    canResume: state?.phase === "paused" && !state.stopping,
    canStop: isActive && !state?.stopping,
    canEmergencyStop: isActive,
  };
}
