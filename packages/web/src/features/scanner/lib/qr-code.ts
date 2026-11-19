import jsQR from "jsqr";

export function readQrImageData(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  scratchCanvas: HTMLCanvasElement,
): ImageData | null {
  const context = scratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!context || sourceWidth <= 0 || sourceHeight <= 0) return null;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  scratchCanvas.width = Math.round(sourceWidth * scale);
  scratchCanvas.height = Math.round(sourceHeight * scale);
  context.drawImage(source, 0, 0, scratchCanvas.width, scratchCanvas.height);
  return context.getImageData(
    0,
    0,
    scratchCanvas.width,
    scratchCanvas.height,
  );
}

export function decodeQrImageData(image: ImageData): string | null {
  const code = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "dontInvert",
  });
  return code?.data || null;
}

export function decodeQrCode(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  scratchCanvas: HTMLCanvasElement,
): string | null {
  const image = readQrImageData(
    source,
    sourceWidth,
    sourceHeight,
    maxDimension,
    scratchCanvas,
  );
  return image ? decodeQrImageData(image) : null;
}
