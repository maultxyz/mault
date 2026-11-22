import { SALES_DEFAULT_RANGE_DAYS } from "@/lib/constants/business";
import type { SalesReportFilters } from "@/lib/interfaces/business";
import {
  SALES_REPORT_BUY_PARAM,
  SALES_REPORT_FROM_PARAM,
  SALES_REPORT_TO_PARAM,
} from "@magic-vault/shared";

export function toLocalIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function salesReportFiltersFrom(
  params: URLSearchParams,
  today: Date = new Date(),
): SalesReportFilters {
  const buyGuid = params.get(SALES_REPORT_BUY_PARAM) || null;
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - (SALES_DEFAULT_RANGE_DAYS - 1));
  const usesDefaultRange = !buyGuid;
  return {
    from:
      params.get(SALES_REPORT_FROM_PARAM) ?? (usesDefaultRange ? toLocalIsoDay(defaultFrom) : ""),
    to: params.get(SALES_REPORT_TO_PARAM) ?? (usesDefaultRange ? toLocalIsoDay(today) : ""),
    buyGuid,
  };
}

export function salesMarginPercent(profit: number, costOfSold: number): number {
  const revenue = profit + costOfSold;
  return revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
}
