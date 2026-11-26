import {
  catalogPrintingMarkGrids,
  PRINTING_MARK_VERSION,
  type BrowserSyncPrintingMarkResult,
  type BrowserSyncWorkCard,
} from "@magic-vault/shared";
import { loadSyncCanvas } from "./embed-sync-image";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";

export async function readSyncPrintingMarks(
  card: BrowserSyncWorkCard,
  signal: AbortSignal,
): Promise<BrowserSyncPrintingMarkResult> {
  if (!card.gameKey || card.printingMarkVersion !== PRINTING_MARK_VERSION) {
    throw new Error("Printing mark version changed. Reload the admin page.");
  }
  // Keep catalog pixels at their original size, as the server does. Model-size
  // downsampling would erase the small marks these grids describe.
  const canvas = await loadSyncCanvas(card.imageUrl, signal, true);
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not get canvas context");
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return {
      kind: "printingMarks",
      cardId: card.cardId,
      version: PRINTING_MARK_VERSION,
      grids: catalogPrintingMarkGrids(image, card.gameKey).map(({ region, values }) => ({
        key: region.key,
        values: Array.from(values),
      })),
    };
  } finally {
    releaseCanvases([canvas]);
  }
}
