import type { WidgetValueTrend } from "@magic-vault/shared";
import { WIDGET_VALUE_CHANGE_EPSILON } from "@/lib/constants/widgets";
import type { ValueChange } from "@/lib/interfaces/value-change";

export function valueChangeOf(
  trend: Pick<WidgetValueTrend, "totalValue" | "previousValue">,
  formatPrice: (value: number) => string,
  locale: string,
): ValueChange | null {
  if (trend.previousValue === null) return null;
  const difference = trend.totalValue - trend.previousValue;
  const direction =
    difference > WIDGET_VALUE_CHANGE_EPSILON ? "up" : difference < -WIDGET_VALUE_CHANGE_EPSILON ? "down" : "flat";
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
