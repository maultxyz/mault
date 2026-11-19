import { scorePrinting } from "@/features/calibration/api/printing-score";
import { extractCardImage, canvasToBlob } from "@/features/scanner/lib/card-detection";
import { detectAndDewarpCard } from "@/features/scanner/lib/client-vectorize";
import { embedCanvas, rotateCanvas180 } from "@/features/scanner/lib/milo-client";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import type {
  PrintingFrameScanCheck,
  PrintingFrameScore,
  ScorePrintingFrameInput,
} from "@/lib/interfaces/calibration";
import { getDefaultCardContour, type PrintingScoreResult } from "@magic-vault/shared";

const PRINTING_SCORE_SCAN_CHECK_MATCHES_NEEDED = 1;

function copyCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  copy.getContext("2d")?.drawImage(source, 0, 0);
  return copy;
}

async function scoreImageMatch(
  frame: HTMLCanvasElement,
  input: ScorePrintingFrameInput,
  created: HTMLCanvasElement[],
): Promise<PrintingScoreResult> {
  let source: HTMLCanvasElement | null = null;
  try {
    const { dewarpedCanvas } = await detectAndDewarpCard(frame, () => {});
    if (dewarpedCanvas) {
      created.push(dewarpedCanvas);
      source = dewarpedCanvas;
    }
  } catch {
    source = null;
  }

  if (!source) {
    source = extractCardImage(
      frame,
      getDefaultCardContour(frame.width, frame.height, input.region),
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
}

async function checkScan(
  frame: HTMLCanvasElement,
  input: ScorePrintingFrameInput,
): Promise<PrintingFrameScanCheck> {
  const { searchCardImageWithConsensus } = await import(
    "@/features/scanner/lib/card-image-search"
  );
  const scanRegionContour = getDefaultCardContour(
    frame.width,
    frame.height,
    input.region,
  );
  const outcome = await searchCardImageWithConsensus(
    frame,
    () => {},
    scanRegionContour,
    { collectionGuid: input.collectionGuid },
    input.ocrMode,
    PRINTING_SCORE_SCAN_CHECK_MATCHES_NEEDED,
    input.checkBothOrientations,
    input.gameKey,
  );
  return {
    card: outcome.card
      ? {
          id: outcome.card.id,
          name: outcome.card.name,
          set: outcome.card.set,
          collectorNumber: outcome.card.collectorNumber,
        }
      : null,
    scannedImageUrl: outcome.debugImageUrl,
    cropContour: outcome.detectedContour ?? scanRegionContour,
    cardDetected: !!outcome.detectedContour,
    frameWidth: frame.width,
    frameHeight: frame.height,
    lowConfidenceMatch: outcome.matched?.lowConfidenceMatch ?? false,
    matched: outcome.matched?.diagnostics ?? null,
    unmatched: outcome.noMatch?.diagnostics ?? null,
  };
}

export async function scorePrintingFrame(
  input: ScorePrintingFrameInput,
): Promise<PrintingFrameScore> {
  const frame = copyCanvas(input.canvas);
  const created: HTMLCanvasElement[] = [frame];
  try {
    const score = await scoreImageMatch(frame, input, created);
    const scanCheck = await checkScan(frame, input);
    return { score, scanCheck };
  } finally {
    releaseCanvases(created);
  }
}
