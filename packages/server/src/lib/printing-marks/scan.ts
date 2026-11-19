import {
  detectPrintedLanguageCodeRgba,
  PRINTED_LANGUAGE_CODE_BANDS_BY_GAME_KEY,
  printingRegionsOf,
  scanPrintingMarkGrids,
  wholeImageHomography,
  type PrintingMarkScanGrids,
} from "@magic-vault/shared";
import { rgbaFromImageBuffer } from "./decode";

export async function scanGridsFromImageBuffer(
  gameKey: string,
  buffer: Buffer,
): Promise<PrintingMarkScanGrids | null> {
  if (printingRegionsOf(gameKey).length === 0) return null;
  const image = await rgbaFromImageBuffer(buffer);
  return scanPrintingMarkGrids(
    image,
    wholeImageHomography(image),
    gameKey,
    "upright",
  );
}

export async function printedLanguageCodeFromImageBuffer(
  gameKey: string,
  buffer: Buffer,
): Promise<boolean | null> {
  if (!PRINTED_LANGUAGE_CODE_BANDS_BY_GAME_KEY[gameKey]) return null;
  const image = await rgbaFromImageBuffer(buffer);
  return detectPrintedLanguageCodeRgba(image, gameKey)?.present ?? null;
}
