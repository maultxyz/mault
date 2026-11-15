import {
  loadDeviceSetting,
  saveDeviceSetting,
} from "@/features/scanner/lib/camera-device-settings";
import { CAMERA_FOCUS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type {
  CameraRange,
  CameraTrackCapabilities,
  CameraTrackSettings,
} from "@/lib/interfaces/scanner";

export function loadSavedFocus(deviceId: string | null): number | null {
  return loadDeviceSetting(CAMERA_FOCUS_STORAGE_KEY, deviceId);
}

export function saveFocus(deviceId: string | null, value: number | null) {
  saveDeviceSetting(CAMERA_FOCUS_STORAGE_KEY, deviceId, value);
}

export function manualFocusRange(
  track: MediaStreamTrack,
): CameraRange | null {
  const caps = track.getCapabilities() as CameraTrackCapabilities;
  return caps.focusDistance && caps.focusMode?.includes("manual")
    ? caps.focusDistance
    : null;
}

export function currentFocusDistance(track: MediaStreamTrack): number | null {
  const settings = track.getSettings() as CameraTrackSettings;
  return settings.focusDistance ?? null;
}

export function applyFocus(
  track: MediaStreamTrack,
  value: number | null,
): Promise<void> {
  const constraint =
    value === null
      ? { focusMode: "continuous" }
      : { focusMode: "manual", focusDistance: value };
  return track.applyConstraints({
    advanced: [constraint as MediaTrackConstraintSet],
  });
}
