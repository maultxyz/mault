import {
  detectPrintedFoilMarkerRgba,
  PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY,
  rotateRgba180,
  type PrintedFoilMarkerDetection,
  type ScanOrientation,
} from "@magic-vault/shared";

export function detectPrintedFoilMarker(
  uprightCrop: () => HTMLCanvasElement | null,
  orientation: ScanOrientation,
  gameKey: string | undefined,
): PrintedFoilMarkerDetection | null {
  if (!gameKey || !PRINTED_FOIL_MARKER_BANDS_BY_GAME_KEY[gameKey]) return null;
  const crop = uprightCrop();
  const ctx = crop?.getContext("2d");
  if (!crop || !ctx) return null;
  const pixels = ctx.getImageData(0, 0, crop.width, crop.height);
  return detectPrintedFoilMarkerRgba(
    orientation === "rotated" ? rotateRgba180(pixels) : pixels,
    gameKey,
  );
}
