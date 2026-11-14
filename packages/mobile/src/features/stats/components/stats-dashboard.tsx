import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { foldChartSegments, statsActivityAverage, statsHeroSparklineValues, statsSharePercent } from "@magic-vault/shared";
import { CardArt } from "@/components/cards/card-art";
import { AppText } from "@/components/ui/app-text";
import { TabStrip } from "@/components/ui/tab-strip";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { HomeHero } from "@/features/home/components/home-hero";
import { BarList } from "@/features/stats/components/bar-list";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { HomeActivityFigure } from "@/features/home/components/home-activity-figure";
import { AreaChart } from "@/features/stats/components/area-chart";
import { DonutChart } from "@/features/stats/components/donut-chart";
import { StatsHighlights } from "@/features/stats/components/stats-highlights";
import { StatsSection } from "@/features/stats/components/stats-section";
import { toStatsBreakdown } from "@/features/stats/lib/stats-breakdown";
import { buildStatsInsights } from "@/features/stats/lib/stats-insights";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import {
  STATS_ACTIVITY_METRICS,
  STATS_BAR_LIST_LIMIT,
  STATS_COLLECTION_METRICS,
  STATS_HISTOGRAM_COLUMN_GAP,
  STATS_LIST_COLLAPSED_COUNT,
  STATS_SPLIT_MAX_SEGMENTS,
  STATS_TOP_CARD_COLUMNS,
  STATS_TOP_CARD_RANK_BADGE_SIZE,
} from "@/lib/constants/stats";
import { CARD_ART_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import { formatDay } from "@/lib/dates";
import type {
  StatsActivityMetric,
  StatsActivitySectionProps,
  StatsBreakdownEntry,
  StatsCollectionMetric,
  StatsCollectionsSectionProps,
  StatsDashboardProps,
  StatsTopCardsProps,
} from "@/lib/interfaces/stats";
import { cardArtSources } from "@/lib/card-art";

function StatsActivitySection({ report }: StatsActivitySectionProps) {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const [metric, setMetric] = useState<StatsActivityMetric>("count");
  const isWeekly = report.bucket === "week";
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const compact = new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 });

  return (
    <StatsSection
      title={t("stats.activity.title")}
      description={t(`stats.activity.description.${report.bucket}`)}
      action={
        <TabStrip<StatsActivityMetric>
          inline
          value={metric}
          onChange={setMetric}
          items={STATS_ACTIVITY_METRICS.map((value) => ({ value, label: t(`stats.activity.metrics.${value}`) }))}
        />
      }
    >
      <View style={{ flexDirection: "row", gap: SPACING.xl }}>
        {metric === "count" ? (
          <>
            <HomeActivityFigure value={number.format(report.totals.scansInRange)} label={t("stats.activity.total")} />
            <HomeActivityFigure value={number.format(statsActivityAverage(report))} label={t(`stats.activity.average.${report.bucket}`)} />
          </>
        ) : (
          <>
            <HomeActivityFigure value={pricing.format(report.totals.valueAddedInRange)} label={t("stats.activity.metrics.value")} />
            <HomeActivityFigure
              value={pricing.format(report.activity.length > 0 ? report.totals.valueAddedInRange / report.activity.length : 0)}
              label={t(`stats.activity.average.${report.bucket}`)}
            />
          </>
        )}
      </View>
      <AreaChart
        accessibilityLabel={t(`stats.activity.metrics.${metric}`)}
        data={report.activity.map((bucket) => ({
          key: bucket.start,
          label: isWeekly
            ? t("stats.activity.weekOf", { date: formatDay(bucket.start, i18n.language) })
            : formatDay(bucket.start, i18n.language),
          value: metric === "count" ? bucket.count : bucket.value,
        }))}
        formatValue={(value) => (metric === "count" ? value.toLocaleString(i18n.language) : pricing.format(value))}
        formatAxisValue={(value) =>
          metric === "count" ? compact.format(value) : pricing.format(value)
        }
        endLabel={isWeekly ? t("stats.activity.thisWeek") : t("stats.activity.today")}
      />
    </StatsSection>
  );
}

function StatsCollectionsSection({ collections, onSelectCollection }: StatsCollectionsSectionProps) {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const [metric, setMetric] = useState<StatsCollectionMetric>("totalValue");
  const total = collections.reduce((sum, row) => sum + row[metric], 0);
  const ranked = [...collections].sort((a, b) => b[metric] - a[metric]);

  return (
    <StatsSection
      title={t("stats.compare.title")}
      description={t("stats.compare.description")}
      action={
        <TabStrip<StatsCollectionMetric>
          inline
          value={metric}
          onChange={setMetric}
          items={STATS_COLLECTION_METRICS.map((value) => ({ value, label: t(`stats.compare.metrics.${value}`) }))}
        />
      }
    >
      <BarList
        items={ranked.map((row) => ({
          key: row.guid,
          label: row.name,
          value: row[metric],
          display: metric === "totalValue" ? pricing.format(row.totalValue) : row[metric].toLocaleString(i18n.language),
          secondary: t("stats.compare.share", { percent: statsSharePercent(row[metric], total) }),
          onPress: () => onSelectCollection(row.guid),
        }))}
        collapsedCount={STATS_LIST_COLLAPSED_COUNT}
      />
    </StatsSection>
  );
}

function StatsTopCards({ cards }: StatsTopCardsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  if (cards.length === 0) return null;

  return (
    <StatsSection title={t("stats.topCards.title")}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: SPACING.md, rowGap: SPACING.lg }}>
        {cards.map((entry, index) => (
          <Pressable
            key={entry.scanId}
            accessibilityRole="button"
            accessibilityLabel={`${t("stats.topCards.rank", { rank: index + 1 })}, ${entry.card.name}`}
            onPress={() =>
              router.push({ pathname: "/card/[scanId]", params: { scanId: entry.scanId, guid: entry.collectionGuid } })
            }
            style={({ pressed }) => ({
              width: `${100 / STATS_TOP_CARD_COLUMNS - 4}%` as `${number}%`,
              gap: 6,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              style={{
                width: "100%",
                aspectRatio: CARD_ASPECT_RATIO,
                borderRadius: CARD_ART_RADIUS,
                overflow: "hidden",
                backgroundColor: colors.muted,
              }}
            >
              <CardArt
                {...cardArtSources(entry.card.image)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: SPACING.xs,
                  left: SPACING.xs,
                  minWidth: STATS_TOP_CARD_RANK_BADGE_SIZE,
                  height: STATS_TOP_CARD_RANK_BADGE_SIZE,
                  paddingHorizontal: SPACING.xs,
                  borderRadius: RADIUS.full,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: index === 0 ? colors.primary : colors.tonal,
                }}
              >
                <AppText
                  size="xs"
                  weight="bold"
                  style={{ color: index === 0 ? colors.primaryForeground : colors.foreground }}
                >
                  {index + 1}
                </AppText>
              </View>
            </View>
            <View>
              <AppText size="sm" weight="semibold" numberOfLines={1}>
                {entry.card.name}
              </AppText>
              <AppText size="xs" tone="secondary" numberOfLines={1}>
                {[entry.price != null ? pricing.format(entry.price) : null, entry.collectionName]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </StatsSection>
  );
}

export function StatsDashboard({ report, onSelectCollection }: StatsDashboardProps) {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const colors = useTheme();
  const { totals } = report;
  const breakdown = report.breakdown && report.breakdown.totalCount > 0 ? toStatsBreakdown(report.breakdown) : null;
  const isOrg = report.scope === "org";
  const number = (value: number) => value.toLocaleString(i18n.language);
  const insights = buildStatsInsights(report, t, pricing.format, i18n.language);

  const priceColumns = report.priceBuckets.map((bucket) => ({
    key: bucket.key,
    label:
      bucket.max == null
        ? t("stats.prices.atLeast", { min: pricing.format(bucket.min) })
        : bucket.min === 0
          ? t("stats.prices.under", { max: pricing.format(bucket.max) })
          : t("stats.prices.between", { min: pricing.format(bucket.min), max: pricing.format(bucket.max) }),
    value: bucket.count,
    detail: pricing.format(bucket.value),
  }));

  const renderSplit = (entries: StatsBreakdownEntry[]) => (
    <DonutChart
      segments={foldChartSegments(
        entries.map((entry) => ({
          key: entry.key,
          label: entry.label,
          value: entry.count,
          color: entry.color ?? colors.mutedForeground,
        })),
        STATS_SPLIT_MAX_SEGMENTS,
        { key: "other", label: t("stats.other"), color: colors.mutedForeground },
      )}
      centerValue={number(totals.cardCount)}
      centerLabel={t("stats.tiles.cards")}
      formatShare={(value, total) => t("stats.compare.share", { percent: statsSharePercent(value, total) })}
    />
  );

  return (
    <View style={{ gap: SPACING.lg + SPACING.xs }}>
      <HomeHero
        label={t("stats.tiles.totalValue")}
        value={pricing.format(totals.totalValue)}
        change={null}
        changeCaption=""
        sparklineValues={statsHeroSparklineValues(report)}
        stats={[
          { label: t("stats.tiles.cards"), value: number(totals.cardCount) },
          { label: t("stats.tiles.unique"), value: number(totals.uniqueCount) },
          { label: t("stats.tiles.avgValue"), value: pricing.format(totals.avgValue) },
        ]}
      />

      <StatsHighlights insights={insights} />

      <StatGroup heading={t("stats.tiles.heading")}>
        <StatTile
          icon="scan"
          label={t(`stats.tiles.scanned.${report.range}`)}
          value={number(totals.scansInRange)}
          hint={t("stats.tiles.valueAddedHint", { value: pricing.format(totals.valueAddedInRange) })}
        />
        <StatTile
          icon="coins"
          label={t("stats.tiles.priced")}
          value={number(totals.priceableCount)}
          hint={t("stats.tiles.shareHint", { percent: statsSharePercent(totals.priceableCount, totals.cardCount) })}
        />
        <StatTile
          icon="sparkles"
          label={t("stats.tiles.foils")}
          value={number(totals.foilCount)}
          hint={t("stats.tiles.shareHint", { percent: statsSharePercent(totals.foilCount, totals.cardCount) })}
        />
        <StatTile
          icon="help"
          label={t("stats.tiles.needsReview")}
          value={number(totals.needsReviewCount)}
          hint={t("stats.tiles.correctedHint", { count: totals.correctedCount })}
        />
      </StatGroup>

      <StatsActivitySection report={report} />

      <StatsTopCards cards={report.topCards} />

      {isOrg && report.collections.length > 1 ? (
        <StatsCollectionsSection collections={report.collections} onSelectCollection={onSelectCollection} />
      ) : null}

      <StatsSection title={t("stats.prices.title")} description={t("stats.prices.description")}>
        <ColumnChart
          data={priceColumns}
          formatValue={(value) => t("stats.cardCount", { count: value })}
          formatColumnValue={number}
          accessibilityLabel={t("stats.prices.title")}
          columnGap={STATS_HISTOGRAM_COLUMN_GAP}
          labelEachColumn
        />
      </StatsSection>

      {breakdown && breakdown.rarities.length > 0 ? (
        <StatsSection title={t("stats.rarities.title")} description={t("stats.rarities.description")}>
          {renderSplit(breakdown.rarities)}
        </StatsSection>
      ) : null}

      {breakdown && breakdown.colors.length > 0 ? (
        <StatsSection title={t("stats.colors.title")} description={t("stats.colors.description")}>
          {renderSplit(breakdown.colors)}
        </StatsSection>
      ) : null}

      {isOrg && report.games.length > 1 ? (
        <StatsSection title={t("stats.games.title")}>
          <BarList
            items={report.games.map((game) => ({
              key: game.key ?? "none",
              label: game.name ?? t("stats.games.none"),
              value: game.totalValue,
              display: pricing.format(game.totalValue),
              secondary: t("stats.cardCount", { count: game.cardCount }),
            }))}
            collapsedCount={STATS_LIST_COLLAPSED_COUNT}
          />
        </StatsSection>
      ) : null}

      {breakdown && breakdown.sets.length > 0 ? (
        <StatsSection title={t("stats.sets.title")}>
          <BarList
            items={breakdown.sets.slice(0, STATS_BAR_LIST_LIMIT).map((set) => ({
              key: set.code,
              label: set.name || set.code.toUpperCase(),
              value: set.value,
              display: pricing.format(set.value),
              secondary: t("stats.cardCount", { count: set.count }),
            }))}
            collapsedCount={STATS_LIST_COLLAPSED_COUNT}
          />
        </StatsSection>
      ) : null}

      {breakdown && breakdown.foilTypes.length > 0 ? (
        <StatsSection title={t("stats.foils.title")}>
          <BarList
            items={breakdown.foilTypes.map((foil) => ({
              key: foil.key,
              label: foil.label,
              value: foil.count,
              display: number(foil.count),
            }))}
            collapsedCount={STATS_LIST_COLLAPSED_COUNT}
          />
        </StatsSection>
      ) : null}
    </View>
  );
}
