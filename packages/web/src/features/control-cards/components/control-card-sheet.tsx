import { BrandIcon } from "@/components/brand-icon";
import { EmptyState } from "@/components/empty-state";
import { ControlCardTile } from "@/features/control-cards/components/control-card-tile";
import { CardSheetCutLines } from "@/components/card-sheet-cut-lines";
import { cardSheetGeometry, percentOf } from "@/lib/card-sheet";
import {
  CONTROL_CARD_SHEET_LAYOUT,
  CONTROL_CARDS_PER_PAGE,
} from "@/lib/constants/control-cards";
import type { ControlCardSheetProps } from "@/lib/interfaces/control-cards";
import { IconQrcode } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ControlCardSheet({ entries, onRemove }: ControlCardSheetProps) {
  const { t } = useTranslation("scanner");
  const layout = CONTROL_CARD_SHEET_LAYOUT;
  const geometry = cardSheetGeometry(layout);
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={IconQrcode}
        title={t("controlCards.sheet.emptyTitle")}
        description={t("controlCards.sheet.emptyDescription")}
        className="print:hidden"
      />
    );
  }
  const pages = Array.from(
    { length: Math.ceil(entries.length / CONTROL_CARDS_PER_PAGE) },
    (_, pageIndex) =>
      entries.slice(
        pageIndex * CONTROL_CARDS_PER_PAGE,
        (pageIndex + 1) * CONTROL_CARDS_PER_PAGE,
      ),
  );
  return (
    <div className="flex flex-col gap-6 md:gap-2 print:block">
      {pages.map((pageEntries) => (
        <div
          key={pageEntries[0].id}
          className="relative mx-auto w-full max-w-[215.9mm] overflow-hidden bg-white ring-1 ring-border print:w-[215.9mm] print:max-w-none print:break-after-page print:ring-0 print:last:break-after-auto"
          style={{ aspectRatio: `${layout.pageWidth} / ${layout.pageHeight}` }}
        >
          <svg
            className="absolute inset-0 size-full"
            viewBox={`0 0 ${layout.pageWidth} ${layout.pageHeight}`}
            aria-hidden
          >
            <CardSheetCutLines
              grid={layout}
              geometry={geometry}
              color={layout.cutLineColor}
              width={layout.cutLineWidth}
            />
            <g
              className="text-black"
              transform={`translate(${layout.logo.originX} ${layout.logo.originY}) rotate(-90)`}
            >
              <BrandIcon
                x={0}
                y={-layout.logo.markSize}
                width={layout.logo.markSize}
                height={layout.logo.markSize}
              />
              <text
                x={layout.logo.markSize + layout.logo.wordmarkGap}
                y={-layout.logo.markSize / 2}
                dominantBaseline="central"
                fontSize={layout.logo.wordmarkFontSize}
                fill="currentColor"
                className="font-heading font-semibold"
              >
                {layout.logo.wordmark}
              </text>
            </g>
          </svg>
          <div
            className="absolute grid"
            style={{
              left: percentOf(geometry.gridLeft, layout.pageWidth),
              top: percentOf(geometry.gridTop, layout.pageHeight),
              width: percentOf(geometry.gridWidth, layout.pageWidth),
              height: percentOf(geometry.gridHeight, layout.pageHeight),
              gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
            }}
          >
            {pageEntries.map((entry) => (
              <ControlCardTile
                key={entry.id}
                entry={entry}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
