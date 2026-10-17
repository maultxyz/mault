import { detectColorBarRgba, type ColorBarRegion } from "@magic-vault/shared";

export function detectColorBar(
  canvas: HTMLCanvasElement,
  region: ColorBarRegion,
): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return detectColorBarRgba(
    ctx.getImageData(0, 0, canvas.width, canvas.height),
    region,
  );
}
