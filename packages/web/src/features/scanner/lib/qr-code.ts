import jsQR from "jsqr";

export function decodeQrCode(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
  scratchCanvas: HTMLCanvasElement,
): string | null {
  const context = scratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!context || sourceWidth <= 0 || sourceHeight <= 0) return null;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  scratchCanvas.width = Math.round(sourceWidth * scale);
  scratchCanvas.height = Math.round(sourceHeight * scale);
  context.drawImage(source, 0, 0, scratchCanvas.width, scratchCanvas.height);
  const image = context.getImageData(
    0,
    0,
    scratchCanvas.width,
    scratchCanvas.height,
  );
  const code = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "dontInvert",
  });
  return code?.data || null;
}
