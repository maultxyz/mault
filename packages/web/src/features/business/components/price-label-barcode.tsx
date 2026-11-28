import { encodeCode128 } from "@/lib/code128";
import { PRICE_LABEL_BARCODE_BAR_RATIO, PRICE_LABEL_LINE_HEIGHT } from "@/lib/constants/price-labels";
import type { PriceLabelBarcodeProps } from "@/lib/interfaces/price-labels";
import { useMemo } from "react";

export function PriceLabelBarcode({ sku, height, skuFontSize }: PriceLabelBarcodeProps) {
  const { bars, totalModules } = useMemo(() => encodeCode128(sku), [sku]);
  return (
    <div className="flex shrink-0 flex-col items-center" style={{ height: `${height}px` }}>
      <svg
        aria-hidden
        className="w-full"
        style={{ height: `${height * PRICE_LABEL_BARCODE_BAR_RATIO}px` }}
        viewBox={`0 0 ${totalModules} 1`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        {bars.map((bar) => (
          <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={1} fill="#000" />
        ))}
      </svg>
      <div
        className="w-full truncate text-center font-medium tabular-nums"
        style={{ fontSize: `${skuFontSize}px`, lineHeight: PRICE_LABEL_LINE_HEIGHT }}
      >
        {sku}
      </div>
    </div>
  );
}
