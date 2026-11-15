import type { OrgOverviewCard } from "./interfaces/org-overview.interface";
import type { CardPriceChangeSinceScan, ValueChange } from "./interfaces/value-change.interface";
import type { WidgetValueTrend } from "./interfaces/widget-summary.interface";

export const VALUE_CHANGE_EPSILON = 0.005;

export function valueChangeOf(
  trend: Pick<WidgetValueTrend, "totalValue" | "previousValue">,
  formatPrice: (value: number) => string,
  locale: string,
): ValueChange | null {
  if (trend.previousValue === null) return null;
  const difference = trend.totalValue - trend.previousValue;
  const direction =
    difference > VALUE_CHANGE_EPSILON ? "up" : difference < -VALUE_CHANGE_EPSILON ? "down" : "flat";
  const sign = direction === "up" ? "+" : direction === "down" ? "-" : "";
  const change = `${sign}${formatPrice(Math.abs(difference))}`;
  const percent =
    trend.previousValue > 0
      ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(
          difference / trend.previousValue,
        )
      : change;
  return { direction, change, percent };
}

export function cardPriceChangeSinceScanOf(
  card: Pick<OrgOverviewCard, "price" | "priceChangeSinceScan">,
  formatPrice: (value: number) => string,
  locale: string,
): CardPriceChangeSinceScan | null {
  const difference = card.priceChangeSinceScan;
  if (difference == null || Math.abs(difference) <= VALUE_CHANGE_EPSILON) return null;
  const direction = difference > 0 ? "up" : "down";
  const priceAtScan = card.price == null ? null : card.price - difference;
  const change =
    priceAtScan != null && priceAtScan > 0
      ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(
          difference / priceAtScan,
        )
      : `${direction === "up" ? "+" : "-"}${formatPrice(Math.abs(difference))}`;
  return { direction, change };
}
