import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  SCAN_PAGE_ORIENTATION_SAMPLE_HEIGHT_PX,
  SCAN_PAGE_ORIENTATION_SAMPLE_WIDTH_PX,
  SCAN_PAGE_SAVED_IMAGE_MAX_DIMENSION_PX,
  SCAN_PAGE_SAVED_IMAGE_QUALITY,
} from "@/lib/constants/scanner";
import type { QuarterTurns } from "@/lib/interfaces/scanner";

export async function scanPageImageDataUrl(page: File): Promise<string | undefined> {
  const bitmap = await createImageBitmap(page);
  const canvas = document.createElement("canvas");
  try {
    const scale = Math.min(
      1,
      SCAN_PAGE_SAVED_IMAGE_MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height),
    );
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", SCAN_PAGE_SAVED_IMAGE_QUALITY);
  } catch (error) {
    console.error("[scanner] encoding the scanned page failed:", error);
    return undefined;
  } finally {
    bitmap.close();
    releaseCanvases([canvas]);
  }
}

async function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();
  return image;
}

function drawTurned(
  image: HTMLImageElement,
  quarterTurns: QuarterTurns,
  canvasWidth: number,
  canvasHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get canvas context");
  const sidewaysTurn = quarterTurns % 2 === 1;
  const drawnWidth = sidewaysTurn ? canvasHeight : canvasWidth;
  const drawnHeight = sidewaysTurn ? canvasWidth : canvasHeight;
  context.translate(canvasWidth / 2, canvasHeight / 2);
  context.rotate((quarterTurns * Math.PI) / 2);
  context.drawImage(image, -drawnWidth / 2, -drawnHeight / 2, drawnWidth, drawnHeight);
  return canvas;
}

function grayscaleSample(image: HTMLImageElement, quarterTurns: QuarterTurns): number[] {
  const canvas = drawTurned(
    image,
    quarterTurns,
    SCAN_PAGE_ORIENTATION_SAMPLE_WIDTH_PX,
    SCAN_PAGE_ORIENTATION_SAMPLE_HEIGHT_PX,
  );
  try {
    const { data } = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height);
    const luminance: number[] = [];
    for (let index = 0; index < data.length; index += 4) {
      luminance.push(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
    }
    return luminance;
  } finally {
    releaseCanvases([canvas]);
  }
}

export function normalizedCorrelation(first: number[], second: number[]): number {
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const firstMean = mean(first);
  const secondMean = mean(second);
  let product = 0;
  let firstSquares = 0;
  let secondSquares = 0;
  first.forEach((value, index) => {
    const firstDeviation = value - firstMean;
    const secondDeviation = second[index] - secondMean;
    product += firstDeviation * secondDeviation;
    firstSquares += firstDeviation * firstDeviation;
    secondSquares += secondDeviation * secondDeviation;
  });
  const scale = Math.sqrt(firstSquares * secondSquares);
  return scale > 0 ? product / scale : 0;
}

export function quarterTurnsMatchingReference(
  sampleTurned: (quarterTurns: QuarterTurns) => number[],
  reference: number[],
  imageIsPortrait: boolean,
  referenceIsPortrait: boolean,
): QuarterTurns {
  const candidates: QuarterTurns[] = imageIsPortrait === referenceIsPortrait ? [0, 2] : [1, 3];
  return candidates.reduce((best, candidate) =>
    normalizedCorrelation(sampleTurned(candidate), reference) >
    normalizedCorrelation(sampleTurned(best), reference)
      ? candidate
      : best,
  );
}

export async function quarterTurnsToMatchImage(
  imageUrl: string,
  referenceImageUrl: string,
): Promise<QuarterTurns> {
  const [image, referenceImage] = await Promise.all([
    loadImage(imageUrl),
    loadImage(referenceImageUrl),
  ]);
  return quarterTurnsMatchingReference(
    (quarterTurns) => grayscaleSample(image, quarterTurns),
    grayscaleSample(referenceImage, 0),
    image.naturalHeight >= image.naturalWidth,
    referenceImage.naturalHeight >= referenceImage.naturalWidth,
  );
}

export async function turnImageDataUrl(
  imageUrl: string,
  quarterTurns: QuarterTurns,
): Promise<string> {
  if (quarterTurns === 0) return imageUrl;
  const image = await loadImage(imageUrl);
  const sidewaysTurn = quarterTurns % 2 === 1;
  const canvas = drawTurned(
    image,
    quarterTurns,
    sidewaysTurn ? image.naturalHeight : image.naturalWidth,
    sidewaysTurn ? image.naturalWidth : image.naturalHeight,
  );
  try {
    return canvas.toDataURL("image/jpeg", SCAN_PAGE_SAVED_IMAGE_QUALITY);
  } finally {
    releaseCanvases([canvas]);
  }
}

export async function orientDocumentScanImages(
  savedImageUrl: string | undefined,
  scannedBackImageUrl: string | undefined,
  matchedCardImageUrl: string | null,
  fallbackImageUrl: string,
): Promise<{ capturedImageUrl: string; capturedBackImageUrl: string | undefined }> {
  if (!savedImageUrl || !matchedCardImageUrl) {
    return { capturedImageUrl: savedImageUrl ?? fallbackImageUrl, capturedBackImageUrl: scannedBackImageUrl };
  }
  try {
    const quarterTurns = await quarterTurnsToMatchImage(savedImageUrl, matchedCardImageUrl);
    const backQuarterTurns = ((4 - quarterTurns) % 4) as QuarterTurns;
    return {
      capturedImageUrl: await turnImageDataUrl(savedImageUrl, quarterTurns),
      capturedBackImageUrl: scannedBackImageUrl
        ? await turnImageDataUrl(scannedBackImageUrl, backQuarterTurns)
        : undefined,
    };
  } catch (error) {
    console.error("[scanner] turning the scanned page upright failed:", error);
    return { capturedImageUrl: savedImageUrl, capturedBackImageUrl: scannedBackImageUrl };
  }
}
