import { CardSheetCutLines } from "@/components/card-sheet-cut-lines";
import { cardSheetGeometry } from "@/lib/card-sheet";
import {
  BATCH_DIVIDER_SHEET_LAYOUT,
  BATCH_DIVIDERS_PER_PAGE,
} from "@/lib/constants/storage-labels";
import type {
  BatchDivider,
  BatchDividerSheetProps,
  BatchDividerTextLine,
} from "@/lib/interfaces/storage-labels";
import { fittedLabelFontSize } from "@/lib/label-sheet";
import { useTranslation } from "react-i18next";

export function BatchDividerSheet({ dividers, showsLocationName }: BatchDividerSheetProps) {
  const { t } = useTranslation("storage");
  const layout = BATCH_DIVIDER_SHEET_LAYOUT;
  const geometry = cardSheetGeometry(layout);
  const dividerWidth = layout.tileWidth - layout.bleed * 2;
  const textWidth = dividerWidth - layout.padding * 2;
  const textLines = (divider: BatchDivider): BatchDividerTextLine[] => {
    const title =
      divider.kind === "custom"
        ? divider.text
        : t("labels.dividers.batchTitle", { batch: divider.batch });
    const lines: BatchDividerTextLine[] = [
      {
        text: title,
        fontSize: fittedLabelFontSize(title, textWidth, layout.titleMaxFontSize, 1),
        isTitle: true,
      },
    ];
    if (showsLocationName && divider.locationName) {
      lines.push({
        text: divider.locationName,
        fontSize: fittedLabelFontSize(divider.locationName, textWidth, layout.detailFontSize, 1),
        isTitle: false,
      });
    }
    if (divider.kind === "batch") {
      lines.push({
        text: t("labels.dividers.slotRange", { first: divider.firstSlot, last: divider.lastSlot }),
        fontSize: layout.detailFontSize,
        isTitle: false,
      });
    }
    return lines;
  };
  const pages = Array.from(
    { length: Math.ceil(dividers.length / BATCH_DIVIDERS_PER_PAGE) },
    (_, pageIndex) =>
      dividers.slice(pageIndex * BATCH_DIVIDERS_PER_PAGE, (pageIndex + 1) * BATCH_DIVIDERS_PER_PAGE),
  );
  return (
    <div className="flex flex-col gap-6 md:gap-2 print:block">
      {pages.map((pageDividers, pageIndex) => (
        <svg
          key={pageDividers[0].key}
          role="img"
          aria-label={t("labels.dividers.pageDescription", {
            page: pageIndex + 1,
            names: pageDividers
              .map((divider) => textLines(divider).map((line) => line.text).join(" "))
              .join(", "),
          })}
          viewBox={`0 0 ${layout.pageWidth} ${layout.pageHeight}`}
          className="mx-auto block w-full max-w-[215.9mm] bg-white ring-1 ring-border print:h-[279.4mm] print:w-[215.9mm] print:max-w-none print:break-after-page print:ring-0 print:last:break-after-auto"
        >
          <CardSheetCutLines
            grid={layout}
            geometry={geometry}
            color={layout.cutLineColor}
            width={layout.cutLineWidth}
          />
          {pageDividers.map((divider, index) => {
            const left =
              geometry.gridLeft + (index % layout.columns) * layout.tileWidth + layout.bleed;
            const top =
              geometry.gridTop + Math.floor(index / layout.columns) * layout.tileHeight + layout.bleed;
            const lines = textLines(divider);
            const baselines = lines.reduce<number[]>((positions, line, lineIndex) => {
              const previousBottom =
                lineIndex === 0
                  ? layout.padding
                  : positions[lineIndex - 1] + lines[lineIndex - 1].fontSize * 0.2 + layout.lineGap;
              return [...positions, previousBottom + line.fontSize * 0.8];
            }, []);
            return (
              <g key={divider.key} transform={`translate(${left} ${top})`}>
                <line
                  x1={0}
                  x2={dividerWidth}
                  y1={layout.tabHeight}
                  y2={layout.tabHeight}
                  stroke={layout.cardTopLineColor}
                  strokeWidth={layout.cutLineWidth}
                  strokeDasharray={layout.cardTopLineDash}
                />
                {lines.map((line, lineIndex) => (
                  <text
                    key={lineIndex}
                    x={layout.padding}
                    y={baselines[lineIndex]}
                    fontSize={line.fontSize}
                    fill="#000000"
                    className={line.isTitle ? "font-heading font-semibold" : undefined}
                  >
                    {line.text}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      ))}
    </div>
  );
}
