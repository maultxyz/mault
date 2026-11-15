import { describe, expect, it } from "vitest";
import { LABEL_SHEET_TEMPLATES } from "@/lib/constants/label-sheets";
import { layoutLabelSheetPages } from "@/lib/label-sheet";

describe("layoutLabelSheetPages", () => {
  const template = LABEL_SHEET_TEMPLATES["avery-5160"];

  it("fits Avery 5160 inside a Letter page", () => {
    const right = template.marginLeft + (template.columns - 1) * template.horizontalPitch + template.labelWidth;
    const bottom = template.marginTop + (template.rows - 1) * template.verticalPitch + template.labelHeight;
    expect(template.pageWidth - right).toBeCloseTo(template.marginLeft);
    expect(template.pageHeight - bottom).toBeCloseTo(template.marginTop);
  });

  it("fills labels row by row from the start position and continues on the next sheet", () => {
    const pages = layoutLabelSheetPages(template, 4, 29);
    expect(pages).toHaveLength(2);
    expect(pages[0].placements.map((placement) => placement.itemIndex)).toEqual([0, 1]);
    expect(pages[0].placements[0].x).toBeCloseTo(template.marginLeft + template.horizontalPitch);
    expect(pages[0].placements[0].y).toBeCloseTo(template.marginTop + 9 * template.verticalPitch);
    expect(pages[1].placements[0]).toMatchObject({ itemIndex: 2, x: template.marginLeft, y: template.marginTop });
  });

  it("returns no pages without items", () => {
    expect(layoutLabelSheetPages(template, 0, 1)).toEqual([]);
  });
});
