import {
  CARD_DETECTION_RETRY_INTERVAL_MS,
  CARD_DETECTION_RETRY_TIMEOUT_MS,
  type CornerDetection,
} from "@magic-vault/shared";
import { detectCardCorners } from "./cornelius";
import { dewarpCard } from "./perspective-warp";
import type {
  ClientDewarpResult,
  SettledCardCapture,
} from "@/lib/interfaces/scanner";
import { delay } from "@/lib/delay";

let snapshot: HTMLCanvasElement | null = null;

export function copyFrameInto(
  target: HTMLCanvasElement,
  source: HTMLCanvasElement,
): HTMLCanvasElement {
  if (target.width !== source.width) target.width = source.width;
  if (target.height !== source.height) target.height = source.height;
  const ctx = target.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0);
  return target;
}

function snapshotCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  snapshot ??= document.createElement("canvas");
  return copyFrameInto(snapshot, source);
}

export function dewarpSettledCard({
  frame,
  detection,
}: SettledCardCapture): ClientDewarpResult {
  return {
    detection,
    dewarpedCanvas: detection.contour
      ? dewarpCard(frame, detection.contour)
      : null,
    frame,
  };
}

async function detectCardCornersWithRetry(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
): Promise<{ detection: CornerDetection; frame: HTMLCanvasElement }> {
  const start = Date.now();
  refreshFrame();
  let frame = snapshotCanvas(canvas);
  let detection = await detectCardCorners(frame);
  while (
    !detection.cardPresent &&
    Date.now() - start < CARD_DETECTION_RETRY_TIMEOUT_MS
  ) {
    await delay(CARD_DETECTION_RETRY_INTERVAL_MS);
    refreshFrame();
    frame = snapshotCanvas(canvas);
    detection = await detectCardCorners(frame);
  }
  return { detection, frame };
}

export async function detectAndDewarpCard(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
): Promise<ClientDewarpResult> {
  const { detection, frame } = await detectCardCornersWithRetry(
    canvas,
    refreshFrame,
  );
  if (!detection.cardPresent || !detection.contour) {
    return { detection, dewarpedCanvas: null, frame };
  }

  return {
    detection,
    dewarpedCanvas: dewarpCard(frame, detection.contour),
    frame,
  };
}
