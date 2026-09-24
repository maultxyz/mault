import {
  CARD_DETECTION_RETRY_INTERVAL_MS,
  CARD_DETECTION_RETRY_TIMEOUT_MS,
} from "@/lib/constants/timing";
import { detectCardCorners, type CornerDetection } from "./cornelius";
import { embedCardCanvas, type DualEmbedding } from "./milo-client";
import { dewarpCard } from "./perspective-warp";

export interface ClientVectorizeResult {
  detection: CornerDetection;
  dewarpedCanvas: HTMLCanvasElement | null;
  embeddings: DualEmbedding | null;
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
): Promise<{ detection: CornerDetection; frame: HTMLCanvasElement }> {
  const start = Date.now();
  let frame = snapshotCanvas(canvas);
  let detection = await detectCardCorners(frame);
  while (
    !detection.cardPresent &&
    Date.now() - start < CARD_DETECTION_RETRY_TIMEOUT_MS
  ) {
    await delay(CARD_DETECTION_RETRY_INTERVAL_MS);
    frame = snapshotCanvas(canvas);
    detection = await detectCardCorners(frame);
  }
  return { detection, frame };
}

export async function vectorizeCardImageOnClient(
  canvas: HTMLCanvasElement,
  includeRotated: boolean,
): Promise<ClientVectorizeResult> {
  const { detection, frame } = await detectCardCornersWithRetry(canvas);
  if (!detection.cardPresent || !detection.contour) {
    return { detection, dewarpedCanvas: null, embeddings: null };
  }

  const dewarpedCanvas = dewarpCard(frame, detection.contour);
  const embeddings = await embedCardCanvas(dewarpedCanvas, includeRotated);
  return { detection, dewarpedCanvas, embeddings };
}
