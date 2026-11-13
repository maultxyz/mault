import { assertHardwareAllowedWhileImpersonating } from "@/lib/auth/impersonation";
import {
  CAMERA_BUSY_ERROR_NAMES,
  CAMERA_BUSY_RETRY_DELAYS_MS,
  CAMERA_FALLBACK_RESOLUTIONS,
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
  SCANNER_CAMERA_FRAME_RATE,
} from "@/lib/constants/scanner";
import type { CameraTrackCapabilities } from "@/lib/interfaces/scanner";
import type { StationState } from "@/lib/interfaces/stations";

export function stopMediaStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

function isCameraBusyError(error: unknown): boolean {
  return error instanceof DOMException && CAMERA_BUSY_ERROR_NAMES.has(error.name);
}

export async function getUserMediaWhenCameraIsReleased(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  for (const delayMs of CAMERA_BUSY_RETRY_DELAYS_MS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (!isCameraBusyError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return navigator.mediaDevices.getUserMedia(constraints);
}

async function openAtLowerResolution(
  video: MediaTrackConstraints,
  originalError: unknown,
): Promise<MediaStream> {
  if (!isCameraBusyError(originalError)) throw originalError;
  for (const resolution of CAMERA_FALLBACK_RESOLUTIONS) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...video,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
        },
      });
      console.warn("[camera] opened at a lower resolution", resolution);
      return stream;
    } catch (error) {
      if (!isCameraBusyError(error)) throw error;
    }
  }
  throw originalError;
}

export async function acquireStream(
  deviceId?: string,
  preferRear = false,
): Promise<MediaStream> {
  assertHardwareAllowedWhileImpersonating();
  const startedAt = performance.now();
  const source: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : preferRear
      ? { facingMode: { ideal: "environment" } }
      : {};
  const video: MediaTrackConstraints = {
    ...source,
    width: { ideal: CAMERA_IDEAL_WIDTH },
    height: { ideal: CAMERA_IDEAL_HEIGHT },
    frameRate: { ideal: SCANNER_CAMERA_FRAME_RATE },
  };
  const stream = await navigator.mediaDevices
    .getUserMedia({ video: { ...video, zoom: true } as MediaTrackConstraints })
    .catch((error: unknown) => {
      if (!isCameraBusyError(error)) throw error;
      console.warn("[camera] opening with zoom controls failed, retrying without them", error);
      return getUserMediaWhenCameraIsReleased({ video });
    })
    .catch((error: unknown) => openAtLowerResolution(video, error));

  console.warn("[camera] opened", {
    deviceId,
    milliseconds: Math.round(performance.now() - startedAt),
  });

  const track = stream.getVideoTracks()[0];
  if (track) trackSetups.set(track, applyContinuousFocusAndWidestZoom(track));

  return stream;
}

const trackSetups = new WeakMap<MediaStreamTrack, Promise<void>>();

export function waitForTrackSetup(track: MediaStreamTrack): Promise<void> {
  return trackSetups.get(track) ?? Promise.resolve();
}

async function applyContinuousFocusAndWidestZoom(track: MediaStreamTrack) {
  const startedAt = performance.now();
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
  console.warn("[camera] focus and zoom applied", {
    milliseconds: Math.round(performance.now() - startedAt),
  });
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
  preferRear = false,
): Promise<MediaStream | null> {
  if (preferredId && !takenIds.has(preferredId)) {
    try {
      return await acquireStream(preferredId);
    } catch {}
  }
  if (takenIds.size === 0) return acquireStream(undefined, preferRear);
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
