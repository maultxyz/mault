import { MISSING_PRICE_TEXT, SALES_REPORT_BUY_PARAM } from "@magic-vault/shared";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { intakeLotQueryOptions, salesReportQueryOptions } from "@/features/business/api/business";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { useCompactCount } from "@/hooks/use-compact-count";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import {
  BUSINESS_LIST_SKELETON_ROWS,
  SALES_DEFAULT_RANGE,
  SALES_RANGE_DAYS,
  SALES_RANGES,
} from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { SaleRowItemProps, SalesRange, SalesViewProps } from "@/lib/interfaces/business";

function localDayDaysAgo(days: number): string {
  const day = new Date();
  day.setDate(day.getDate() - (days - 1));
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

function SaleRowItem({ sale, showProfit }: SaleRowItemProps) {
  const { t, i18n } = useTranslation();
  const { format } = usePricing();
  const printing = [
    sale.setCode ? sale.setCode.toUpperCase() : null,
    sale.collectorNumber ? `#${sale.collectorNumber}` : null,
    sale.condition,
    sale.isFoil ? t("business.picks.walk.foil") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const details = [
    new Date(sale.soldAt).toLocaleDateString(i18n.language, { dateStyle: "medium" }),
    sale.buyName ? t("business.sales.fromBuy", { name: sale.buyName }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const price = sale.salePrice != null ? format(sale.salePrice) : MISSING_PRICE_TEXT;
  const profit = showProfit && sale.profit != null ? t("business.sales.rowProfit", { amount: format(sale.profit) }) : null;
  return (
    <ListRow
      title={sale.cardName}
      subtitle={printing ? `${printing}\n${details}` : details}
      subtitleNumberOfLines={2}
      right={
        <View
          accessible
          accessibilityLabel={[sale.salePrice != null ? price : t("trade.noPrice"), profit].filter(Boolean).join(", ")}
          style={{ alignItems: "flex-end", gap: SPACING.xs, flexShrink: 0 }}
        >
          <AppText weight="semibold" numberOfLines={1}>
            {price}
          </AppText>
          {profit ? (
            <AppText size="xs" tone="secondary" numberOfLines={1}>
              {profit}
            </AppText>
          ) : null}
        </View>
      }
    />
  );
}

export function SalesView({ buyGuid }: SalesViewProps) {
  const { t, i18n } = useTranslation();
  const orgId = useActiveOrgId();
  const compactCount = useCompactCount();
  const { format, formatCompact } = usePricing();
  const [range, setRange] = useState<SalesRange>(buyGuid ? "all" : SALES_DEFAULT_RANGE);
  const days = SALES_RANGE_DAYS[range];
  const fromDay = useMemo(() => (days == null ? null : localDayDaysAgo(days)), [days]);
  const access = useQuery(businessAccessQueryOptions(orgId));
  const showProfit = !!access.data?.canViewCosts;
  const buy = useQuery(intakeLotQueryOptions(buyGuid ?? undefined));
  const sales = useInfiniteQuery(salesReportQueryOptions(orgId, { fromDay, buyGuid }));
  const firstPage = sales.data?.pages[0];
  const items = sales.data?.pages.flatMap((page) => page.items) ?? [];
  const totals = firstPage?.totals;
  const money = (value: number) => ({ value: formatCompact(value), exactValue: format(value) });
  const percent = (value: number) =>
    `${new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(value)}%`;

  const filters = (
    <View style={{ gap: SPACING.sm }}>
      {buyGuid ? (
        <ListGroup>
          <ListRow
            icon="coins"
            title={t("business.sales.filteredByBuy", { name: buy.data?.customerName ?? "" })}
            value={t("business.sales.showAll")}
            accessibilityHint={t("business.sales.showAllHint")}
            onPress={() => router.setParams({ [SALES_REPORT_BUY_PARAM]: "" })}
          />
        </ListGroup>
      ) : null}
      <SegmentedControl<SalesRange>
        value={range}
        onChange={setRange}
        options={SALES_RANGES.map((value) => ({ value, label: t(`business.sales.ranges.${value}`) }))}
      />
    </View>
  );

  if (sales.isPending) {
    return (
      <View style={{ gap: SPACING.md }}>
        {filters}
        <ListSkeleton rows={BUSINESS_LIST_SKELETON_ROWS} />
      </View>
    );
  }
  if (sales.isError && !sales.data) {
    return (
      <View style={{ gap: SPACING.md }}>
        {filters}
        <QueryErrorState
          title={t("business.loadFailed")}
          onRetry={() => void sales.refetch()}
          isRetrying={sales.isRefetching}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: SPACING.md }}>
      {filters}
      {totals ? (
        <View style={{ gap: SPACING.sm }}>
          <StatGroup>
            <StatTile icon="store" label={t("business.sales.totals.sold")} {...compactCount(totals.saleCount)} />
            <StatTile icon="coins" label={t("business.sales.totals.revenue")} {...money(totals.revenue)} />
          </StatGroup>
          {showProfit && totals.cost != null && totals.profit != null ? (
            <StatGroup>
              <StatTile label={t("business.sales.totals.costOfSold")} {...money(totals.cost)} />
              <StatTile label={t("business.sales.totals.profit")} {...money(totals.profit)} />
              <StatTile
                label={t("business.sales.totals.margin")}
                value={totals.marginPercent != null ? percent(totals.marginPercent) : MISSING_PRICE_TEXT}
                exactValue={totals.marginPercent != null ? undefined : t("business.buy.performance.notAvailable")}
              />
            </StatGroup>
          ) : null}
          {showProfit && totals.saleCount > totals.costedCount ? (
            <AppText size="xs" tone="secondary">
              {t("business.sales.uncostedNote", { count: totals.saleCount - totals.costedCount })}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {items.length === 0 ? (
        <EmptyState icon="store" title={t("business.sales.emptyTitle")} description={t("business.sales.emptyDescription")} />
      ) : (
        <ListGroup>
          {items.map((sale) => (
            <SaleRowItem key={sale.guid} sale={sale} showProfit={showProfit} />
          ))}
        </ListGroup>
      )}
      {sales.hasNextPage ? (
        <Button
          variant="secondary"
          label={t("business.showMore")}
          loading={sales.isFetchingNextPage}
          onPress={() => void sales.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}
