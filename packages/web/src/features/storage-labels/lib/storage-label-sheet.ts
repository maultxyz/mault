import QRCode from "qrcode";
import type {
  StorageLabelPage,
  StorageLabelTemplate,
} from "@/lib/interfaces/storage-labels";

export function layoutStorageLabelPages(
  template: StorageLabelTemplate,
  itemCount: number,
  startPosition: number,
): StorageLabelPage[] {
  const labelsPerSheet = template.columns * template.rows;
  const firstSlot = Math.min(Math.max(Math.trunc(startPosition), 1), labelsPerSheet) - 1;
  const pages: StorageLabelPage[] = [];
  for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
    const slot = firstSlot + itemIndex;
    const pageIndex = Math.floor(slot / labelsPerSheet);
    const slotOnPage = slot % labelsPerSheet;
    const column = slotOnPage % template.columns;
    const row = Math.floor(slotOnPage / template.columns);
    if (!pages[pageIndex]) pages[pageIndex] = { pageNumber: pageIndex + 1, placements: [] };
    pages[pageIndex].placements.push({
      x: template.marginLeft + column * template.horizontalPitch,
      y: template.marginTop + row * template.verticalPitch,
      itemIndex,
    });
  }
  return pages;
}

export function qrCodeModules(text: string): { path: string; moduleCount: number } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const segments: string[] = [];
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (modules.get(row, column)) segments.push(`M${column} ${row}h1v1h-1z`);
    }
  }
  return { path: segments.join(""), moduleCount: modules.size };
}

export function storageLabelNameFontSize(
  name: string,
  textWidth: number,
  maxFontSize: number,
  maxLines: number,
): number {
  const averageCharacterWidthRatio = 0.55;
  const fittedFontSize = (textWidth * maxLines) / Math.max(name.length, 1) / averageCharacterWidthRatio;
  return Math.min(maxFontSize, fittedFontSize);
}
