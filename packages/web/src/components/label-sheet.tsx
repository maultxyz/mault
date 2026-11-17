import type { LabelSheetProps } from "@/lib/interfaces/label-sheets";
import { labelsPerSheet, layoutLabelSheetPages } from "@/lib/label-sheet";

export function LabelSheet({
  template,
  itemCount,
  startPosition,
  itemKey,
  renderLabel,
  describePage,
}: LabelSheetProps) {
  const pages = layoutLabelSheetPages(template, itemCount, startPosition);
  const slots = Array.from({ length: labelsPerSheet(template) }, (_, slot) => ({
    slot,
    x: template.marginLeft + (slot % template.columns) * template.horizontalPitch,
    y: template.marginTop + Math.floor(slot / template.columns) * template.verticalPitch,
  }));
  return (
    <div className="flex flex-col gap-6 md:gap-2 print:block">
      {pages.map((page) => (
        <svg
          key={page.pageNumber}
          role="img"
          aria-label={describePage(
            page.placements.map((placement) => placement.itemIndex),
            page.pageNumber,
          )}
          viewBox={`0 0 ${template.pageWidth} ${template.pageHeight}`}
          className="mx-auto block w-full max-w-[215.9mm] bg-white ring-1 ring-border print:h-[279.4mm] print:w-[215.9mm] print:max-w-none print:break-after-page print:ring-0 print:last:break-after-auto"
        >
          <g className="print:hidden">
            {slots.map((slot) => (
              <rect
                key={slot.slot}
                x={slot.x}
                y={slot.y}
                width={template.labelWidth}
                height={template.labelHeight}
                rx={1.5}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth={0.25}
                strokeDasharray="1 1"
              />
            ))}
          </g>
          {page.placements.map((placement) => (
            <g
              key={itemKey(placement.itemIndex)}
              transform={`translate(${placement.x} ${placement.y})`}
            >
              {renderLabel(placement.itemIndex)}
            </g>
          ))}
        </svg>
      ))}
    </div>
  );
}
