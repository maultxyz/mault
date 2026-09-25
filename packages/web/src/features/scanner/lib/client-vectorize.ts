import {
  CARD_DETECTION_RETRY_INTERVAL_MS,
  CARD_DETECTION_RETRY_TIMEOUT_MS,
} from "@/lib/constants/timing";
import { detectCardCorners, type CornerDetection } from "./cornelius";
import { dewarpCard } from "./perspective-warp";

export interface ClientDewarpResult {
  detection: CornerDetection;
  dewarpedCanvas: HTMLCanvasElement | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function snapshotCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const snapshot = document.createElement("canvas");
  snapshot.width = source.width;
  snapshot.height = source.height;
  snapshot.getContext("2d")?.drawImage(source, 0, 0);
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

// refreshFrame redraws the latest camera frame into canvas. The preview's
// requestAnimationFrame loop stops while the tab is hidden or the window is
// minimized, so without this every capture would reuse the last drawn frame.
export async function detectAndDewarpCard(
  canvas: HTMLCanvasElement,
  refreshFrame: () => void,
): Promise<ClientDewarpResult> {
  const { detection, frame } = await detectCardCornersWithRetry(
    canvas,
    refreshFrame,
  );
  if (!detection.cardPresent || !detection.contour) {
    return { detection, dewarpedCanvas: null };
  }

  return { detection, dewarpedCanvas: dewarpCard(frame, detection.contour) };
}
