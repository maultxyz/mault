import type { MonthlyRecurringRevenue } from "./interfaces/plans.interface";

export function formatMonthlyRecurringRevenue(
  revenue: MonthlyRecurringRevenue[],
  locale: string,
): string {
  if (revenue.length === 0) return new Intl.NumberFormat(locale).format(0);
  return revenue
    .map(({ currency, amountInMinorUnits }) => {
      const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      });
      const fractionDigits =
        formatter.resolvedOptions().maximumFractionDigits ?? 2;
      return formatter.format(amountInMinorUnits / 10 ** fractionDigits);
    })
    .join(" + ");
}
