import {
  PRINTED_LANGUAGE_CODE_BANDS_BY_GAME_KEY,
  printingMarksPayload,
  printingRegionsOf,
  type CardContour,
  type PrintingMarksPayload,
  type RgbaImage,
  type ScanOrientation,
} from "@magic-vault/shared";

export function printingMarksSampler(
  frame: HTMLCanvasElement,
  contour: CardContour | null | undefined,
  gameKey: string | undefined,
): (orientation: ScanOrientation) => PrintingMarksPayload | null {
  let pixels: RgbaImage | null = null;
  return (orientation) => {
    if (
      !contour ||
      !gameKey ||
      (printingRegionsOf(gameKey).length === 0 &&
        !PRINTED_LANGUAGE_CODE_BANDS_BY_GAME_KEY[gameKey])
    ) {
      return null;
    }
    if (!pixels) {
      const ctx = frame.getContext("2d");
      if (!ctx) return null;
      pixels = ctx.getImageData(0, 0, frame.width, frame.height);
    }
    return printingMarksPayload(pixels, contour, gameKey, orientation);
  };
}
