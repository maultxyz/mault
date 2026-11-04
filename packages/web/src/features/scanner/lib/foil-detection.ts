import { detectFoilRgba, type FoilDetection } from "@magic-vault/shared";

export function detectFoil(
  canvas: HTMLCanvasElement,
  gameKey: string,
): FoilDetection | null {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width || !canvas.height) return null;
  return detectFoilRgba(
    ctx.getImageData(0, 0, canvas.width, canvas.height),
    gameKey,
  );
}
