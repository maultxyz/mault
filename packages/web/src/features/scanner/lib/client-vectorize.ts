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

async function detectCardCornersWithRetry(
  canvas: HTMLCanvasElement,
): Promise<CornerDetection> {
  const start = Date.now();
  let detection = await detectCardCorners(canvas);
  while (
    !detection.cardPresent &&
    Date.now() - start < CARD_DETECTION_RETRY_TIMEOUT_MS
  ) {
    await delay(CARD_DETECTION_RETRY_INTERVAL_MS);
    detection = await detectCardCorners(canvas);
  }
  return detection;
}

export async function vectorizeCardImageOnClient(
  canvas: HTMLCanvasElement,
): Promise<ClientVectorizeResult> {
  const detection = await detectCardCornersWithRetry(canvas);
  if (!detection.cardPresent || !detection.contour) {
    return { detection, dewarpedCanvas: null, embeddings: null };
  }

  const dewarpedCanvas = dewarpCard(canvas, detection.contour);
  const embeddings = await embedCardCanvas(dewarpedCanvas);
  return { detection, dewarpedCanvas, embeddings };
}
