import { HAND_SCAN_FINGERPRINT_SIZE } from "@/lib/constants/scanner";
import { HAND_SCAN_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { contourToPoints, type CardContour } from "@magic-vault/shared";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function getHandScan(): boolean {
  try {
    return localStorage.getItem(HAND_SCAN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setHandScan(value: boolean): void {
  try {
    if (value) localStorage.setItem(HAND_SCAN_STORAGE_KEY, "true");
    else localStorage.removeItem(HAND_SCAN_STORAGE_KEY);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHandScan() {
  const stored = useSyncExternalStore(subscribe, getHandScan);
  return [stored, setHandScan] as const;
}

let fingerprintCanvas: HTMLCanvasElement | null = null;

export function contourFingerprint(
  canvas: HTMLCanvasElement,
  contour: CardContour,
): Float32Array | null {
  const points = contourToPoints(contour);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.max(0, Math.min(...xs));
  const top = Math.max(0, Math.min(...ys));
  const width = Math.min(canvas.width, Math.max(...xs)) - left;
  const height = Math.min(canvas.height, Math.max(...ys)) - top;
  if (width < 1 || height < 1) return null;

  fingerprintCanvas ??= document.createElement("canvas");
  fingerprintCanvas.width = HAND_SCAN_FINGERPRINT_SIZE;
  fingerprintCanvas.height = HAND_SCAN_FINGERPRINT_SIZE;
  const ctx = fingerprintCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(
    canvas,
    left,
    top,
    width,
    height,
    0,
    0,
    HAND_SCAN_FINGERPRINT_SIZE,
    HAND_SCAN_FINGERPRINT_SIZE,
  );
  const { data } = ctx.getImageData(
    0,
    0,
    HAND_SCAN_FINGERPRINT_SIZE,
    HAND_SCAN_FINGERPRINT_SIZE,
  );
  const fingerprint = new Float32Array(data.length / 4);
  for (let i = 0; i < fingerprint.length; i++) {
    fingerprint[i] =
      (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) /
      255;
  }
  return fingerprint;
}

export function fingerprintDistance(a: Float32Array, b: Float32Array): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}
