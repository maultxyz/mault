import {
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
} from "@/lib/constants/scanner";
import type { CameraTrackCapabilities } from "@/lib/interfaces/scanner";
import type { StationState } from "@/lib/interfaces/stations";

export async function acquireStream(deviceId?: string): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      width: { ideal: CAMERA_IDEAL_WIDTH },
      height: { ideal: CAMERA_IDEAL_HEIGHT },
      zoom: true,
    } as MediaTrackConstraints,
  });

  const track = stream.getVideoTracks()[0];
  if (track) {
    try {
      const capabilities = track.getCapabilities() as CameraTrackCapabilities;
      const constraints: MediaTrackConstraintSet[] = [];
      if (capabilities.focusMode?.includes("continuous")) {
        constraints.push({
          focusMode: "continuous",
        } as MediaTrackConstraintSet);
      }
      if (capabilities.zoom) {
        constraints.push({
          zoom: capabilities.zoom.min,
        } as MediaTrackConstraintSet);
      }
      if (constraints.length > 0) {
        await track.applyConstraints({ advanced: constraints });
      }
    } catch {}
  }

  return stream;
}

async function pickUnusedCamera(
  usedIds: Set<string>,
): Promise<string | undefined> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.find(
      (d) => d.kind === "videoinput" && d.deviceId && !usedIds.has(d.deviceId),
    )?.deviceId;
  } catch {
    return undefined;
  }
}

export async function acquireFreeStream(
  preferredId: string | undefined,
  takenIds: Set<string>,
): Promise<MediaStream | null> {
  if (preferredId && !takenIds.has(preferredId)) {
    try {
      return await acquireStream(preferredId);
    } catch {}
  }
  if (takenIds.size === 0) return acquireStream();
  const excluded = new Set(takenIds);
  if (preferredId) excluded.add(preferredId);
  const freeId = await pickUnusedCamera(excluded);
  return freeId ? acquireStream(freeId) : null;
}

export function camerasHeldByOtherStations(
  stations: StationState[],
  isStationLive: (id: string) => boolean,
  stationId: string,
): Set<string> {
  return new Set(
    stations
      .filter((s) => s.id !== stationId && s.cameraId && isStationLive(s.id))
      .map((s) => s.cameraId as string),
  );
}
