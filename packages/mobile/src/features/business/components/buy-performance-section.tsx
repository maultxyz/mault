import { MISSING_PRICE_TEXT, SALES_REPORT_BUY_PARAM } from "@magic-vault/shared";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { useCompactCount } from "@/hooks/use-compact-count";
import { usePricing } from "@/hooks/use-pricing";
import { BUSINESS_SALES_VIEW } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { BuyPerformanceSectionProps } from "@/lib/interfaces/business";

export function BuyPerformanceSection({ buyGuid, performance }: BuyPerformanceSectionProps) {
  const { t, i18n } = useTranslation();
  const compactCount = useCompactCount();
  const { format, formatCompact } = usePricing();
  const money = (value: number) => ({ value: formatCompact(value), exactValue: format(value) });
  const percent = (value: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(value);

  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={t("business.buy.performance.title")} />
      <AppText size="sm" tone="secondary">
        {t("business.buy.performance.description")}
      </AppText>
      <StatGroup>
        {performance.paidTotal != null ? (
          <StatTile icon="coins" label={t("business.buy.performance.paid")} {...money(performance.paidTotal)} />
        ) : null}
        <StatTile
          icon="store"
          label={t("business.buy.performance.sold")}
          {...compactCount(performance.soldCount)}
          hint={t("business.buy.performance.revenueHint", { amount: format(performance.revenue) })}
        />
      </StatGroup>
      <StatGroup>
        <StatTile label={t("business.buy.performance.costOfSold")} {...money(performance.costOfSold)} />
        <StatTile label={t("business.buy.performance.profit")} {...money(performance.profit)} />
        <StatTile
          label={t("business.buy.performance.paidBack")}
          value={performance.returnPercent != null ? `${percent(performance.returnPercent)}%` : MISSING_PRICE_TEXT}
          exactValue={performance.returnPercent != null ? undefined : t("business.buy.performance.notAvailable")}
        />
      </StatGroup>
      <StatGroup>
        <StatTile
          icon="storage"
          label={t("business.buy.performance.cardsLeft")}
          {...compactCount(performance.remainingCount)}
          hint={t("business.buy.performance.cardsLeftHint", {
            cost: format(performance.remainingCost),
            value: format(performance.remainingSellValue),
          })}
        />
      </StatGroup>
      <ListGroup>
        <ListRow
          icon="stats"
          title={t("business.buy.performance.seeSales")}
          onPress={() =>
            router.push({ pathname: "/business", params: { view: BUSINESS_SALES_VIEW, [SALES_REPORT_BUY_PARAM]: buyGuid } })
          }
        />
      </ListGroup>
    </View>
  );
}
