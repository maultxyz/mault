import { LABEL_SHEET_AVERAGE_CHARACTER_WIDTH_RATIO } from "@/lib/constants/label-sheets";
import type {
  LabelSheetPage,
  LabelSheetTemplate,
} from "@/lib/interfaces/label-sheets";

export function labelsPerSheet(template: LabelSheetTemplate): number {
  return template.columns * template.rows;
}

export function layoutLabelSheetPages(
  template: LabelSheetTemplate,
  itemCount: number,
  startPosition: number,
): LabelSheetPage[] {
  const sheetCapacity = labelsPerSheet(template);
  const firstSlot = Math.min(Math.max(Math.trunc(startPosition), 1), sheetCapacity) - 1;
  const pages: LabelSheetPage[] = [];
  for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
    const slot = firstSlot + itemIndex;
    const pageIndex = Math.floor(slot / sheetCapacity);
    const slotOnPage = slot % sheetCapacity;
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

export function fittedLabelFontSize(
  text: string,
  textWidth: number,
  maxFontSize: number,
  maxLines: number,
): number {
  const fittedFontSize =
    (textWidth * maxLines) / Math.max(text.length, 1) / LABEL_SHEET_AVERAGE_CHARACTER_WIDTH_RATIO;
  return Math.min(maxFontSize, fittedFontSize);
}
