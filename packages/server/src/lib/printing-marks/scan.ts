import {
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
