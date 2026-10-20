import { scorePrinting } from "@/features/calibration/api/printing-score";
import { extractCardImage, canvasToBlob } from "@/features/scanner/lib/card-detection";
import { detectAndDewarpCard } from "@/features/scanner/lib/client-vectorize";
import { embedCanvas, rotateCanvas180 } from "@/features/scanner/lib/milo-client";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import type { PrintingScoreFormValues } from "@/schemas/printing-score.schema";
import { getDefaultCardContour, type PrintingScoreResult, type ScanRegion } from "@magic-vault/shared";

export async function scorePrintingFrame(input: {
  canvas: HTMLCanvasElement;
  region: ScanRegion;
  checkBothOrientations: boolean;
  collectionGuid: string;
  values: PrintingScoreFormValues;
}): Promise<PrintingScoreResult> {
  const created: HTMLCanvasElement[] = [];
  try {
    let source: HTMLCanvasElement | null = null;
    try {
      const { dewarpedCanvas } = await detectAndDewarpCard(input.canvas, () => {});
      if (dewarpedCanvas) {
        created.push(dewarpedCanvas);
        source = dewarpedCanvas;
      }
    } catch {
      source = null;
    }

    if (!source) {
      source = extractCardImage(
        input.canvas,
        getDefaultCardContour(input.canvas.width, input.canvas.height, input.region),
      );
      created.push(source);
    }

    const oriented = [source];
    if (input.checkBothOrientations) {
      const rotated = rotateCanvas180(source);
      created.push(rotated);
      oriented.push(rotated);
    }

    const form = new FormData();
    form.set("collectionGuid", input.collectionGuid);
    form.set("cardId", input.values.cardId);

    try {
      const embeddings = await Promise.all(oriented.map((canvas) => embedCanvas(canvas)));
      embeddings.forEach((embedding, index) => {
        form.set(
          index === 0 ? "embedding" : "rotatedEmbedding",
          JSON.stringify(embedding),
        );
      });
    } catch {
      const blobs = await Promise.all(oriented.map((canvas) => canvasToBlob(canvas)));
      blobs.forEach((blob, index) => {
        form.set(
          index === 0 ? "image" : "rotatedImage",
          blob,
          index === 0 ? "card.jpg" : "card-rotated.jpg",
        );
      });
    }

    return scorePrinting(form);
  } finally {
    releaseCanvases(created);
  }
}
