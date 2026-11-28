import { LabelBrand } from "@/components/label-brand";
import { LabelSheet } from "@/components/label-sheet";
import {
  PRICE_LABEL_BARCODE_HEIGHT_RATIO,
  PRICE_LABEL_DETAIL_FONT_RATIO,
  PRICE_LABEL_LINE_HEIGHT,
  PRICE_LABEL_NAME_FONT_SIZE_PER_LABEL_HEIGHT,
  PRICE_LABEL_NAME_MAX_FONT_SIZE,
  PRICE_LABEL_NAME_MAX_LINES,
  PRICE_LABEL_PRICE_COLUMN_RATIO,
  PRICE_LABEL_PRICE_FONT_SIZE_PER_LABEL_HEIGHT,
  PRICE_LABEL_PRICE_LINE_HEIGHT,
  PRICE_LABEL_PRICE_MAX_FONT_SIZE,
  PRICE_LABEL_SKU_FONT_SIZE_PER_BARCODE_HEIGHT,
  PRICE_LABEL_TEXT_GAP,
} from "@/lib/constants/price-labels";
import { PriceLabelBarcode } from "@/features/business/components/price-label-barcode";
import type {
  PriceLabelProps,
  PriceLabelSheetProps,
} from "@/lib/interfaces/price-labels";
import { fittedLabelFontSize } from "@/lib/label-sheet";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function PriceLabel({
  template,
  item,
  formatLabelPrice,
  showsPrices,
  showsBarcodes,
}: PriceLabelProps) {
  const { t: tCards } = useTranslation("cards");
  const { card, labelPrice } = item;
  const padding = template.contentPadding;
  const contentWidth = template.labelWidth - padding * 2;
  const contentHeight = template.labelHeight - padding * 2;
  const barcodeHeight = showsBarcodes ? contentHeight * PRICE_LABEL_BARCODE_HEIGHT_RATIO : 0;
  const textLabelHeight = template.labelHeight - barcodeHeight;
  const priceWidth = showsPrices ? contentWidth * PRICE_LABEL_PRICE_COLUMN_RATIO : 0;
  const textWidth = showsPrices ? contentWidth - priceWidth - PRICE_LABEL_TEXT_GAP : contentWidth;
  const priceText = !showsPrices || labelPrice === null ? "" : formatLabelPrice(labelPrice);
  const nameMaxFontSize = Math.min(
    PRICE_LABEL_NAME_MAX_FONT_SIZE,
    textLabelHeight * PRICE_LABEL_NAME_FONT_SIZE_PER_LABEL_HEIGHT,
  );
  const nameMaxLines = card.storageCode ? 1 : PRICE_LABEL_NAME_MAX_LINES;
  const nameFontSize = fittedLabelFontSize(card.name, textWidth, nameMaxFontSize, nameMaxLines);
  const priceFontSize = fittedLabelFontSize(
    priceText,
    priceWidth,
    Math.min(
      PRICE_LABEL_PRICE_MAX_FONT_SIZE,
      textLabelHeight * PRICE_LABEL_PRICE_FONT_SIZE_PER_LABEL_HEIGHT,
    ),
    1,
  );
  const detailFontSize = nameMaxFontSize * PRICE_LABEL_DETAIL_FONT_RATIO;
  const detailText = [
    [card.setCode.toUpperCase(), card.collectorNumber && `#${card.collectorNumber}`]
      .filter(Boolean)
      .join(" "),
    card.condition,
    card.isFoil && tCards("foil"),
    card.language?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <foreignObject x={padding} y={padding} width={contentWidth} height={contentHeight}>
      <div className="flex h-full flex-col text-black">
        <div className="flex min-h-0 flex-1" style={{ gap: `${PRICE_LABEL_TEXT_GAP}px` }}>
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div
              className={cn(
                "min-h-0 font-heading font-semibold break-words",
                nameMaxLines === 1 ? "line-clamp-1" : "line-clamp-2",
              )}
              style={{ fontSize: `${nameFontSize}px`, lineHeight: PRICE_LABEL_LINE_HEIGHT }}
            >
              {card.name}
            </div>
            <div className="flex min-w-0 shrink-0 flex-col">
              <div
                className="truncate font-medium tabular-nums"
                style={{ fontSize: `${detailFontSize}px`, lineHeight: PRICE_LABEL_LINE_HEIGHT }}
              >
                {detailText}
              </div>
              {card.storageCode && (
                <div
                  className="truncate font-semibold tabular-nums"
                  style={{ fontSize: `${detailFontSize}px`, lineHeight: PRICE_LABEL_LINE_HEIGHT }}
                >
                  {card.storageCode}
                </div>
              )}
            </div>
          </div>
          <div
            className="flex shrink-0 flex-col items-end justify-between"
            style={showsPrices ? { width: `${priceWidth}px` } : undefined}
          >
            <div
              className="font-heading font-bold tabular-nums whitespace-nowrap"
              style={{ fontSize: `${priceFontSize}px`, lineHeight: PRICE_LABEL_PRICE_LINE_HEIGHT }}
            >
              {priceText}
            </div>
            <LabelBrand fontSize={detailFontSize} />
          </div>
        </div>
        {showsBarcodes && (
          <PriceLabelBarcode
            sku={card.sku}
            height={barcodeHeight}
            skuFontSize={barcodeHeight * PRICE_LABEL_SKU_FONT_SIZE_PER_BARCODE_HEIGHT}
          />
        )}
      </div>
    </foreignObject>
  );
}

export function PriceLabelSheet({
  template,
  items,
  startPosition,
  formatLabelPrice,
  showsPrices,
  showsBarcodes,
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
          showsPrices={showsPrices}
          showsBarcodes={showsBarcodes}
        />
      )}
      describePage={(itemIndexes, pageNumber) =>
        t("priceLabels.sheet.pageDescription", {
          page: pageNumber,
          labels: itemIndexes
            .map((itemIndex) => {
              const { card, labelPrice } = items[itemIndex];
              return [
                card.name,
                !showsPrices || labelPrice === null ? null : formatLabelPrice(labelPrice),
                card.storageCode,
                showsBarcodes ? card.sku : null,
              ]
                .filter(Boolean)
                .join(" ");
            })
            .join(", "),
        })
      }
    />
  );
}
