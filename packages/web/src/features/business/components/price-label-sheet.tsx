import { LabelSheet } from "@/components/label-sheet";
import {
  PRICE_LABEL_DETAIL_FONT_RATIO,
  PRICE_LABEL_LINE_HEIGHT,
  PRICE_LABEL_NAME_FONT_SIZE_PER_LABEL_HEIGHT,
  PRICE_LABEL_NAME_MAX_FONT_SIZE,
  PRICE_LABEL_NAME_MAX_LINES,
  PRICE_LABEL_PRICE_COLUMN_RATIO,
  PRICE_LABEL_PRICE_FONT_SIZE_PER_LABEL_HEIGHT,
  PRICE_LABEL_PRICE_MAX_FONT_SIZE,
  PRICE_LABEL_TEXT_GAP,
} from "@/lib/constants/price-labels";
import type {
  PriceLabelProps,
  PriceLabelSheetProps,
} from "@/lib/interfaces/price-labels";
import { fittedLabelFontSize } from "@/lib/label-sheet";
import { useTranslation } from "react-i18next";

function PriceLabel({ template, item, formatLabelPrice }: PriceLabelProps) {
  const { t: tCards } = useTranslation("cards");
  const { card, labelPrice } = item;
  const padding = template.contentPadding;
  const contentWidth = template.labelWidth - padding * 2;
  const contentHeight = template.labelHeight - padding * 2;
  const priceWidth = contentWidth * PRICE_LABEL_PRICE_COLUMN_RATIO;
  const textWidth = contentWidth - priceWidth - PRICE_LABEL_TEXT_GAP;
  const priceText = labelPrice === null ? "" : formatLabelPrice(labelPrice);
  const nameFontSize = fittedLabelFontSize(
    card.name,
    textWidth,
    Math.min(
      PRICE_LABEL_NAME_MAX_FONT_SIZE,
      template.labelHeight * PRICE_LABEL_NAME_FONT_SIZE_PER_LABEL_HEIGHT,
    ),
    PRICE_LABEL_NAME_MAX_LINES,
  );
  const priceFontSize = fittedLabelFontSize(
    priceText,
    priceWidth,
    Math.min(
      PRICE_LABEL_PRICE_MAX_FONT_SIZE,
      template.labelHeight * PRICE_LABEL_PRICE_FONT_SIZE_PER_LABEL_HEIGHT,
    ),
    1,
  );
  const detailStyle = {
    fontSize: `${nameFontSize * PRICE_LABEL_DETAIL_FONT_RATIO}px`,
    lineHeight: PRICE_LABEL_LINE_HEIGHT,
  };
  return (
    <foreignObject x={padding} y={padding} width={contentWidth} height={contentHeight}>
      <div className="flex h-full items-center text-black" style={{ gap: `${PRICE_LABEL_TEXT_GAP}px` }}>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div
            className="line-clamp-2 font-heading font-semibold break-words"
            style={{ fontSize: `${nameFontSize}px`, lineHeight: PRICE_LABEL_LINE_HEIGHT }}
          >
            {card.name}
          </div>
          <div className="truncate tabular-nums" style={detailStyle}>
            {[card.setCode.toUpperCase(), card.collectorNumber && `#${card.collectorNumber}`]
              .filter(Boolean)
              .join(" ")}
          </div>
          <div className="truncate" style={detailStyle}>
            {[card.condition, card.isFoil && tCards("foil"), card.language?.toUpperCase()]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div
          className="shrink-0 text-right font-heading font-bold tabular-nums whitespace-nowrap"
          style={{
            width: `${priceWidth}px`,
            fontSize: `${priceFontSize}px`,
            lineHeight: PRICE_LABEL_LINE_HEIGHT,
          }}
        >
          {priceText}
        </div>
      </div>
    </foreignObject>
  );
}

export function PriceLabelSheet({
  template,
  items,
  startPosition,
  formatLabelPrice,
}: PriceLabelSheetProps) {
  const { t } = useTranslation("business");
  return (
    <LabelSheet
      template={template}
      itemCount={items.length}
      startPosition={startPosition}
      itemKey={(itemIndex) => items[itemIndex].card.scanId}
      renderLabel={(itemIndex) => (
        <PriceLabel
          template={template}
          item={items[itemIndex]}
          formatLabelPrice={formatLabelPrice}
        />
      )}
      describePage={(itemIndexes, pageNumber) =>
        t("priceLabels.sheet.pageDescription", {
          page: pageNumber,
          labels: itemIndexes
            .map((itemIndex) => {
              const { card, labelPrice } = items[itemIndex];
              return labelPrice === null
                ? card.name
                : `${card.name} ${formatLabelPrice(labelPrice)}`;
            })
            .join(", "),
        })
      }
    />
  );
}
