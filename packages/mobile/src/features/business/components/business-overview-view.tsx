import {
  BUSINESS_OVERVIEW_SALES_DAYS,
  CARD_RESERVATION_OPEN_STAGES,
  businessOverviewAttentionItems,
  formatCompactNumber,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SectionHeader } from "@/components/ui/section-header";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { businessOverviewQueryOptions } from "@/features/business/api/business";
import { AreaChart } from "@/features/stats/components/area-chart";
import { StatsHighlights } from "@/features/stats/components/stats-highlights";
import { StatsSection } from "@/features/stats/components/stats-section";
import { useCompactCount } from "@/hooks/use-compact-count";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import {
  BUSINESS_ATTENTION_ICONS,
  BUSINESS_INTAKE_VIEW,
  BUSINESS_LIST_SKELETON_ROWS,
  BUSINESS_PICKS_VIEW,
  BUSINESS_RESERVATIONS_VIEW,
} from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { BusinessOverviewViewProps } from "@/lib/interfaces/business";
import type { StatsInsight } from "@/lib/interfaces/stats";

function formatSalesDay(day: string, locale: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function BusinessOverviewView({ onOpenView }: BusinessOverviewViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const orgId = useActiveOrgId();
  const compactCount = useCompactCount();
  const { format, formatCompact } = usePricing();
  const overview = useQuery(businessOverviewQueryOptions(orgId));
  const data = overview.data;

  if (overview.isPending) return <ListSkeleton rows={BUSINESS_LIST_SKELETON_ROWS} />;
  if (overview.isError || !data) {
    return (
      <QueryErrorState
        title={t("business.loadFailed")}
        onRetry={() => void overview.refetch()}
        isRetrying={overview.isRefetching}
      />
    );
  }

  const { intake, picks, reservations, sales } = data;
  const attention = businessOverviewAttentionItems(data);
  const insights: StatsInsight[] =
    attention.length > 0
      ? attention.map((item) => ({
          key: item.key,
          icon: BUSINESS_ATTENTION_ICONS[item.key],
          title: t(`business.overview.attention.${item.key}.title`, { count: item.count }),
          detail: t(`business.overview.attention.${item.key}.detail`, { count: item.count }),
          onPress: () => onOpenView(item.section),
        }))
      : [
          {
            key: "allClear",
            icon: "check",
            title: t("business.overview.attention.allClear.title"),
            detail: t("business.overview.attention.allClear.detail"),
          },
        ];
  const showsRevenue = sales.total != null;

  return (
    <View style={{ gap: SPACING.xl }}>
      <StatGroup heading={t("business.overview.now.heading")}>
        <StatTile
          icon="coins"
          label={t("business.overview.tiles.openIntake")}
          onPress={() => onOpenView(BUSINESS_INTAKE_VIEW)}
          {...compactCount(intake.openLotCount)}
          hint={t("business.overview.cards", { count: intake.openCardCount })}
        />
        <StatTile
          icon="checkAll"
          label={t("business.overview.tiles.openPicks")}
          onPress={() => onOpenView(BUSINESS_PICKS_VIEW)}
          {...compactCount(picks.openPickCount)}
          hint={t("business.overview.tiles.readyToComplete", { count: picks.readyToCompleteCount })}
        />
        <StatTile
          icon="checkAll"
          label={t("business.overview.tiles.cardsToPick")}
          onPress={() => onOpenView(BUSINESS_PICKS_VIEW)}
          {...compactCount(picks.cardsToPick)}
        />
        {reservations ? (
          <StatTile
            icon="bookmark"
            label={t("business.reservations.stages.readyForPickup")}
            onPress={() => onOpenView(BUSINESS_RESERVATIONS_VIEW)}
            {...compactCount(reservations.readyForPickup)}
            hint={t("business.overview.tiles.beingPicked", { count: reservations.beingPicked })}
          />
        ) : null}
      </StatGroup>

      <StatGroup heading={t("business.overview.sales.heading", { days: BUSINESS_OVERVIEW_SALES_DAYS })}>
        <StatTile
          icon="store"
          label={t("business.overview.tiles.soldCards")}
          onPress={() => onOpenView(BUSINESS_PICKS_VIEW)}
          {...compactCount(sales.cardCount)}
          hint={t("business.overview.tiles.perDay", {
            count: Math.round((sales.cardCount / BUSINESS_OVERVIEW_SALES_DAYS) * 10) / 10,
          })}
        />
        {sales.total != null ? (
          <StatTile
            icon="coins"
            label={t("business.overview.tiles.revenue")}
            onPress={() => onOpenView(BUSINESS_PICKS_VIEW)}
            value={formatCompact(sales.total)}
            exactValue={format(sales.total)}
            hint={
              sales.cardCount > 0
                ? t("business.overview.tiles.averageSale", { value: format(sales.total / sales.cardCount) })
                : undefined
            }
          />
        ) : null}
      </StatGroup>

      <StatsHighlights heading={t("business.overview.attention.heading")} insights={insights} />

      <StatsSection
        title={t("business.overview.sales.title")}
        description={t("business.overview.sales.description", { days: BUSINESS_OVERVIEW_SALES_DAYS })}
      >
        <AreaChart
          accessibilityLabel={t(`business.overview.sales.metrics.${showsRevenue ? "revenue" : "count"}`)}
          data={sales.history.map((day) => ({
            key: day.day,
            label: formatSalesDay(day.day, locale),
            value: showsRevenue ? (day.revenue ?? 0) : day.cardCount,
          }))}
          formatValue={(value) => (showsRevenue ? format(value) : t("business.overview.cards", { count: value }))}
          formatAxisValue={(value) => (showsRevenue ? formatCompact(value) : formatCompactNumber(value, locale))}
          endLabel={t("business.overview.sales.today")}
        />
      </StatsSection>

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("business.views.intake")} />
        <AppText size="sm" tone="secondary">
          {t("business.overview.intake.description")}
        </AppText>
        <ListGroup>
          {intake.latestOpenLots.map((lot) => (
            <ListRow
              key={lot.guid}
              icon="coins"
              title={lot.customerName}
              value={t("business.overview.cards", { count: lot.cardCount })}
              onPress={() => router.push({ pathname: "/business/intake/[guid]", params: { guid: lot.guid } })}
            />
          ))}
          <ListRow
            title={intake.latestOpenLots.length > 0 ? t("business.overview.intake.link") : t("business.overview.intake.empty")}
            subtitle={intake.latestOpenLots.length > 0 ? undefined : t("business.overview.intake.link")}
            onPress={() => onOpenView(BUSINESS_INTAKE_VIEW)}
          />
        </ListGroup>
      </View>

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("business.views.picks")} />
        <AppText size="sm" tone="secondary">
          {t("business.overview.picks.description")}
        </AppText>
        <ListGroup>
          {picks.latestOpenPicks.map((pick) => (
            <ListRow
              key={pick.guid}
              icon="checkAll"
              title={pick.name}
              value={t("business.overview.picks.progress", { picked: pick.picked, total: pick.quantity })}
              onPress={() => router.push({ pathname: "/business/order/[guid]", params: { guid: pick.guid } })}
            />
          ))}
          <ListRow
            title={picks.latestOpenPicks.length > 0 ? t("business.overview.picks.link") : t("business.overview.picks.empty")}
            subtitle={picks.latestOpenPicks.length > 0 ? undefined : t("business.overview.picks.link")}
            onPress={() => onOpenView(BUSINESS_PICKS_VIEW)}
          />
        </ListGroup>
      </View>

      {reservations ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("business.overview.reservationsChart.title")} />
          <AppText size="sm" tone="secondary">
            {t("business.overview.reservationsChart.description")}
          </AppText>
          <ListGroup>
            {CARD_RESERVATION_OPEN_STAGES.map((stage) => {
              const figure = compactCount(reservations[stage]);
              return (
                <ListRow
                  key={stage}
                  icon="bookmark"
                  title={t(`business.reservations.stages.${stage}`)}
                  value={figure.value}
                  valueAccessibilityLabel={figure.exactValue}
                  onPress={() => onOpenView(BUSINESS_RESERVATIONS_VIEW)}
                />
              );
            })}
          </ListGroup>
        </View>
      ) : null}
    </View>
  );
}
