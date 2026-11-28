import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { SettingsSection } from "@/components/settings-section";
import { AreaChart } from "@/features/stats/components/area-chart";
import { usePriceSource } from "@/hooks/use-price-source";
import { BUSINESS_SALES_METRICS } from "@/lib/constants/business";
import type {
  BusinessSalesChartProps,
  BusinessSalesMetric,
} from "@/lib/interfaces/business";
import { BUSINESS_OVERVIEW_SALES_DAYS, formatCompactNumber } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function formatSalesDay(day: string, locale: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function BusinessSalesChart({ sales }: BusinessSalesChartProps) {
  const { t, i18n } = useTranslation("business");
  const locale = i18n.language;
  const { format, formatCompact } = usePriceSource();
  const showsRevenue = sales.total != null;
  const [metric, setMetric] = useState<BusinessSalesMetric>(
    showsRevenue ? "revenue" : "count",
  );
  const shownMetric: BusinessSalesMetric = showsRevenue ? metric : "count";

  return (
    <SettingsSection
      heading={t("overview.sales.title")}
      description={t("overview.sales.description", { days: BUSINESS_OVERVIEW_SALES_DAYS })}
      action={
        showsRevenue ? (
          <ResponsiveSegmented
            label={t("overview.sales.title")}
            items={BUSINESS_SALES_METRICS.map((option) => ({
              key: option,
              label: t(`overview.sales.metrics.${option}`),
            }))}
            value={shownMetric}
            onChange={setMetric}
          />
        ) : undefined
      }
    >
      <AreaChart
        ariaLabel={t(`overview.sales.metrics.${shownMetric}`)}
        data={sales.history.map((day) => ({
          key: day.day,
          label: formatSalesDay(day.day, locale),
          value: shownMetric === "revenue" ? (day.revenue ?? 0) : day.cardCount,
        }))}
        formatValue={(value) =>
          shownMetric === "revenue"
            ? format(value)
            : t("overview.cards", { count: value })
        }
        formatAxisValue={(value) =>
          shownMetric === "revenue" ? formatCompact(value) : formatCompactNumber(value, locale)
        }
        endLabel={t("overview.sales.today")}
      />
    </SettingsSection>
  );
}
