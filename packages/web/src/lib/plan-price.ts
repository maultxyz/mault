import type { PlanPriceInfo } from "@magic-vault/shared";

export function formatPlanPrice(
  { amount, currency }: PlanPriceInfo,
  locale: string,
): string {
  const fractionDigits = amount % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount / 100);
}

export function yearlySavingsPercent(
  monthly: PlanPriceInfo | null | undefined,
  yearly: PlanPriceInfo | null | undefined,
): number | null {
  if (!monthly || !yearly || monthly.currency !== yearly.currency) return null;
  const percent = Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100);
  return percent > 0 ? percent : null;
}
