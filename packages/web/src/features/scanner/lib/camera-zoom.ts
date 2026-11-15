import {
  loadDeviceSetting,
  saveDeviceSetting,
} from "@/features/scanner/lib/camera-device-settings";
import { CAMERA_ZOOM_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type {
  CameraRange,
  CameraTrackCapabilities,
  CameraTrackSettings,
} from "@/lib/interfaces/scanner";

export function loadSavedZoom(deviceId: string | null): number | null {
  return loadDeviceSetting(CAMERA_ZOOM_STORAGE_KEY, deviceId);
}

export function saveZoom(deviceId: string | null, value: number | null) {
  saveDeviceSetting(CAMERA_ZOOM_STORAGE_KEY, deviceId, value);
}

export function trackZoomRange(track: MediaStreamTrack): CameraRange | null {
  const zoom = (track.getCapabilities?.() as CameraTrackCapabilities | undefined)
    ?.zoom;
  return zoom && zoom.max > zoom.min ? zoom : null;
}

export function currentZoomLevel(track: MediaStreamTrack): number | null {
  return (track.getSettings() as CameraTrackSettings).zoom ?? null;
}

export function applyZoom(
  track: MediaStreamTrack,
  value: number,
): Promise<void> {
  return track.applyConstraints({
    advanced: [{ zoom: value } as MediaTrackConstraintSet],
  });
}

export function zoomMultiplierLabel(value: number, range: CameraRange): string {
  if (range.min <= 0) return String(Math.round(value));
  return `${(value / range.min).toFixed(1)}×`;
}
