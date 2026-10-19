import {
  CARD_DETECTION_RETRY_INTERVAL_MS,
  CARD_DETECTION_RETRY_TIMEOUT_MS,
  type CornerDetection,
} from "@magic-vault/shared";
import { detectCardCorners } from "./cornelius";
import { dewarpCard } from "./perspective-warp";
import type { ClientDewarpResult } from "@/lib/interfaces/scanner";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let snapshot: HTMLCanvasElement | null = null;

function snapshotCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  snapshot ??= document.createElement("canvas");
  if (snapshot.width !== source.width) snapshot.width = source.width;
  if (snapshot.height !== source.height) snapshot.height = source.height;
  const ctx = snapshot.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.clearRect(0, 0, snapshot.width, snapshot.height);
  ctx.drawImage(source, 0, 0);
  return snapshot;
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

// The preview's requestAnimationFrame loop stops while the tab is hidden, so
// refreshFrame pulls a fresh camera frame instead of reusing the last one drawn.
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
