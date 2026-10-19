import type { CameraRange } from "@/lib/interfaces/scanner";
import { isRemoteBrowser } from "@/lib/host";
import { isPiHost } from "@/lib/pi-host";
import { applyFocus, manualFocusRange } from "./camera-focus";

export const PI_CAMERA_BASE = "/pi-camera";
export const PI_CAMERA_DEVICE_ID = "pi-webcam";
export const PI_CAMERA_WIDTH = 1920;
export const PI_CAMERA_HEIGHT = 1080;
export const PI_CAMERA_LABEL = "USB Live camera";

const piRelayTracks = new WeakSet<MediaStreamTrack>();
const piRelayCanvases = new WeakMap<MediaStream, HTMLCanvasElement>();

export function isPiRelayTrack(track: MediaStreamTrack): boolean {
  return piRelayTracks.has(track);
}

export function drawPiRelayFrame(
  stream: MediaStream | null | undefined,
  target: HTMLCanvasElement,
): boolean {
  if (!stream) return false;
  const source = piRelayCanvases.get(stream);
  if (!source?.width || !source.height) return false;
  if (target.width !== source.width || target.height !== source.height) {
    target.width = source.width;
    target.height = source.height;
  }
  const context = target.getContext("2d");
  if (!context) return false;
  context.drawImage(source, 0, 0);
  return true;
}

export function focusRangeForTrack(
  track: MediaStreamTrack,
): CameraRange | null {
  if (isPiRelayTrack(track)) return null;
  return manualFocusRange(track);
}

export function browserMustUsePiCamera(): boolean {
  return isPiHost() && isRemoteBrowser();
}

export interface PiCameraReady {
  status: "ready";
  label: string;
  width: number;
  height: number;
  focus: CameraRange | null;
}

export type PiCameraHealth = PiCameraReady | { status: "down" | "absent" };

export async function readPiCameraHealth(): Promise<PiCameraHealth> {
  try {
    const response = await fetch(`${PI_CAMERA_BASE}/health`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { status: response.status === 404 ? "absent" : "down" };
    }
    const body = (await response.json()) as {
      label?: string;
      width?: number;
      height?: number;
      focus?: { min?: number; max?: number; step?: number } | null;
    };
    const focus =
      body.focus &&
      typeof body.focus.min === "number" &&
      typeof body.focus.max === "number"
        ? {
            min: body.focus.min,
            max: body.focus.max,
            step: typeof body.focus.step === "number" ? body.focus.step : 1,
          }
        : null;
    return {
      status: "ready",
      label: body.label || PI_CAMERA_LABEL,
      width: body.width || PI_CAMERA_WIDTH,
      height: body.height || PI_CAMERA_HEIGHT,
      focus,
    };
  } catch {
    return { status: "absent" };
  }
}

export function piCameraDevice(label: string): MediaDeviceInfo {
  return {
    deviceId: PI_CAMERA_DEVICE_ID,
    kind: "videoinput",
    label,
    groupId: PI_CAMERA_DEVICE_ID,
    toJSON() {
      return {
        deviceId: this.deviceId,
        kind: this.kind,
        label: this.label,
        groupId: this.groupId,
      };
    },
  };
}

function copyBytes(buffer: Uint8Array, start: number, end?: number): Uint8Array<ArrayBuffer> {
  const view = end === undefined ? buffer.subarray(start) : buffer.subarray(start, end);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

function takeJpeg(
  buffer: Uint8Array,
): { jpeg: Uint8Array<ArrayBuffer>; rest: Uint8Array<ArrayBuffer> } | null {
  let start = -1;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  for (let i = start + 2; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
      return {
        jpeg: copyBytes(buffer, start, i + 2),
        rest: copyBytes(buffer, i + 2),
      };
    }
  }
  return null;
}

export async function acquirePiRelayStream(): Promise<MediaStream> {
  const canvas = document.createElement("canvas");
  canvas.width = PI_CAMERA_WIDTH;
  canvas.height = PI_CAMERA_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("camera canvas unavailable");
  const stream = canvas.captureStream(10);
  piRelayCanvases.set(stream, canvas);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  piRelayTracks.add(track);
  const controller = new AbortController();
  const stop = track.stop.bind(track);
  track.stop = () => {
    controller.abort();
    stop();
  };

  const response = await fetch(`${PI_CAMERA_BASE}/stream`, {
    signal: controller.signal,
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    track.stop();
    throw new Error("camera stream failed");
  }

  let pending: Uint8Array<ArrayBuffer> | null = null;
  let decoding = false;

  const decodeJpeg = async (
    jpeg: Uint8Array<ArrayBuffer>,
  ): Promise<ImageBitmap> => {
    const blob = new Blob([jpeg], { type: "image/jpeg" });
    try {
      return await createImageBitmap(blob);
    } catch {
      const url = URL.createObjectURL(blob);
      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error("jpeg decode failed"));
          element.src = url;
        });
        return await createImageBitmap(image);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  };

  const drawLatest = async () => {
    if (decoding) return;
    decoding = true;
    try {
      while (pending && !controller.signal.aborted) {
        const jpeg = pending;
        pending = null;
        const bitmap = await decodeJpeg(jpeg);
        if (pending || controller.signal.aborted) {
          bitmap.close();
          continue;
        }
        if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
        }
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        track.requestFrame();
      }
    } catch {
    } finally {
      decoding = false;
      if (pending && !controller.signal.aborted) void drawLatest();
    }
  };

  const readFrames = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    let buffer = new Uint8Array(0);
    while (!controller.signal.aborted) {
      const { done, value } = await reader.read();
      if (done || !value) return;
      const next = new Uint8Array(buffer.length + value.length);
      next.set(buffer);
      next.set(value, buffer.length);
      buffer = next;
      let parsed = takeJpeg(buffer);
      while (parsed) {
        pending = parsed.jpeg;
        buffer = parsed.rest;
        parsed = takeJpeg(buffer);
      }
      if (buffer.length > 8_000_000) buffer = copyBytes(buffer, buffer.length - 2);
      if (pending) void drawLatest();
    }
  };

  void (async () => {
    let connected = true;
    while (!controller.signal.aborted) {
      try {
        const next = connected
          ? response
          : await fetch(`${PI_CAMERA_BASE}/stream`, {
              signal: controller.signal,
              cache: "no-store",
            });
        connected = false;
        if (!next.ok || !next.body) throw new Error("camera stream failed");
        await readFrames(next.body);
      } catch {
        if (controller.signal.aborted) return;
      }
      if (controller.signal.aborted) return;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  })();

  return stream;
}

export async function applyPiFocus(value: number | null): Promise<void> {
  const body =
    value === null
      ? { mode: "auto" }
      : { mode: "manual", lensPosition: value };
  const response = await fetch(`${PI_CAMERA_BASE}/focus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || `focus helper ${response.status}`);
  }
}

export async function applyTrackFocus(
  track: MediaStreamTrack,
  value: number | null,
): Promise<void> {
  if (isPiRelayTrack(track)) {
    await applyPiFocus(value);
    return;
  }
  await applyFocus(track, value);
}
