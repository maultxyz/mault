import { CAMERA_FOCUS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type {
  CameraRange,
  CameraTrackCapabilities,
} from "@/lib/interfaces/scanner";

function loadAll(): Record<string, number> {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CAMERA_FOCUS_STORAGE_KEY) ?? "null",
    );
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {};
}

export function loadSavedFocus(deviceId: string | null): number | null {
  if (!deviceId) return null;
  const value = loadAll()[deviceId];
  return typeof value === "number" ? value : null;
}

export function saveFocus(deviceId: string | null, value: number | null) {
  if (!deviceId) return;
  const all = loadAll();
  if (value === null) delete all[deviceId];
  else all[deviceId] = value;
  try {
    localStorage.setItem(CAMERA_FOCUS_STORAGE_KEY, JSON.stringify(all));
  } catch {}
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
  const settings = track.getSettings() as MediaTrackSettings & {
    focusDistance?: number;
  };
  return settings.focusDistance ?? null;
}

// null restores continuous autofocus.
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
