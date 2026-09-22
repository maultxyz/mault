import { detectCardCorners, type CornerDetection } from "./cornelius";
import { embedCardCanvas, type DualEmbedding } from "./milo-client";
import { dewarpCard } from "./perspective-warp";

export interface ClientVectorizeResult {
  detection: CornerDetection;
  dewarpedCanvas: HTMLCanvasElement | null;
  embeddings: DualEmbedding | null;
}

export async function vectorizeCardImageOnClient(
  canvas: HTMLCanvasElement,
): Promise<ClientVectorizeResult> {
  const detection = await detectCardCorners(canvas);
  if (!detection.cardPresent || !detection.contour) {
    return { detection, dewarpedCanvas: null, embeddings: null };
  }

  const dewarpedCanvas = dewarpCard(canvas, detection.contour);
  const embeddings = await embedCardCanvas(dewarpedCanvas);
  return { detection, dewarpedCanvas, embeddings };
}
