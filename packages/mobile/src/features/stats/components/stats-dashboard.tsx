import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatTile } from "@/components/ui/stat-tile";
import { BarList } from "@/features/stats/components/bar-list";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { StatsSection } from "@/features/stats/components/stats-section";
import { percent, toStatsBreakdown } from "@/features/stats/lib/stats-breakdown";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import {
  STATS_ACTIVITY_METRICS,
  STATS_BAR_LIST_LIMIT,
  STATS_COLLECTION_METRICS,
  STATS_TOP_CARD_COLUMNS,
} from "@/lib/constants/stats";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { formatDay } from "@/lib/dates";
import type {
  StatsActivityMetric,
  StatsActivitySectionProps,
  StatsCollectionMetric,
  StatsCollectionsSectionProps,
  StatsDashboardProps,
  StatsTopCardsProps,
} from "@/lib/interfaces/stats";
import { absoluteUrl } from "@/lib/url";

function StatsActivitySection({ report }: StatsActivitySectionProps) {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const [metric, setMetric] = useState<StatsActivityMetric>("count");
  const isWeekly = report.bucket === "week";

  return (
    <StatsSection
      title={t("stats.activity.title")}
      description={t(`stats.activity.description.${report.bucket}`)}
      action={
        <SegmentedControl<StatsActivityMetric>
          value={metric}
          onChange={setMetric}
          options={STATS_ACTIVITY_METRICS.map((value) => ({ value, label: t(`stats.activity.metrics.${value}`) }))}
        />
      }
    >
      <ColumnChart
        accessibilityLabel={t(`stats.activity.metrics.${metric}`)}
        data={report.activity.map((bucket) => ({
          key: bucket.start,
          label: isWeekly
            ? t("stats.activity.weekOf", { date: formatDay(bucket.start, i18n.language) })
            : formatDay(bucket.start, i18n.language),
          value: metric === "count" ? bucket.count : bucket.value,
        }))}
        formatValue={(value) => (metric === "count" ? value.toLocaleString(i18n.language) : pricing.format(value))}
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
        <SegmentedControl<StatsCollectionMetric>
          value={metric}
          onChange={setMetric}
          options={STATS_COLLECTION_METRICS.map((value) => ({ value, label: t(`stats.compare.metrics.${value}`) }))}
        />
      }
    >
      <BarList
        items={ranked.map((row) => ({
          key: row.guid,
          label: row.name,
          value: row[metric],
          display: metric === "totalValue" ? pricing.format(row.totalValue) : row[metric].toLocaleString(i18n.language),
          secondary: t("stats.compare.share", { percent: percent(row[metric], total) }),
          onPress: () => onSelectCollection(row.guid),
        }))}
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
        {cards.map((entry) => (
          <Pressable
            key={entry.scanId}
            accessibilityRole="button"
            accessibilityLabel={entry.card.name}
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
                borderRadius: RADIUS.lg,
                overflow: "hidden",
                backgroundColor: colors.muted,
              }}
            >
              <Image
                source={absoluteUrl(entry.card.image?.normal ?? entry.card.image?.small)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
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
  const { totals } = report;
  const breakdown = report.breakdown && report.breakdown.totalCount > 0 ? toStatsBreakdown(report.breakdown) : null;
  const isOrg = report.scope === "org";
  const number = (value: number) => value.toLocaleString(i18n.language);

  const priceItems = report.priceBuckets.map((bucket) => ({
    key: bucket.key,
    label:
      bucket.max == null
        ? t("stats.prices.atLeast", { min: pricing.format(bucket.min) })
        : bucket.min === 0
          ? t("stats.prices.under", { max: pricing.format(bucket.max) })
          : t("stats.prices.between", { min: pricing.format(bucket.min), max: pricing.format(bucket.max) }),
    value: bucket.count,
    display: number(bucket.count),
    secondary: pricing.format(bucket.value),
  }));

  return (
    <View style={{ gap: SPACING.xxl }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        <StatTile
          label={t("stats.tiles.totalValue")}
          value={pricing.format(totals.totalValue)}
          hint={isOrg ? t("stats.tiles.collectionCount", { count: totals.collectionCount }) : undefined}
        />
        <StatTile
          label={t("stats.tiles.cards")}
          value={number(totals.cardCount)}
          hint={t("stats.tiles.uniqueHint", { count: totals.uniqueCount })}
        />
        <StatTile
          label={t("stats.tiles.avgValue")}
          value={pricing.format(totals.avgValue)}
          hint={t("stats.tiles.pricedHint", { count: totals.priceableCount })}
        />
        <StatTile
          label={t(`stats.tiles.scanned.${report.range}`)}
          value={number(totals.scansInRange)}
          hint={t("stats.tiles.valueAddedHint", { value: pricing.format(totals.valueAddedInRange) })}
        />
        <StatTile
          label={t("stats.tiles.foils")}
          value={number(totals.foilCount)}
          hint={t("stats.tiles.shareHint", { percent: percent(totals.foilCount, totals.cardCount) })}
        />
        <StatTile
          label={t("stats.tiles.needsReview")}
          value={number(totals.needsReviewCount)}
          hint={t("stats.tiles.correctedHint", { count: totals.correctedCount })}
        />
      </View>

      <StatsActivitySection report={report} />

      {isOrg && report.collections.length > 1 ? (
        <StatsCollectionsSection collections={report.collections} onSelectCollection={onSelectCollection} />
      ) : null}

      <StatsSection title={t("stats.prices.title")} description={t("stats.prices.description")}>
        <BarList items={priceItems} />
      </StatsSection>

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
          />
        </StatsSection>
      ) : null}

      {breakdown && breakdown.rarities.length > 0 ? (
        <StatsSection title={t("stats.rarities.title")}>
          <BarList
            items={breakdown.rarities.map((rarity) => ({
              key: rarity.key,
              label: rarity.label,
              value: rarity.count,
              display: number(rarity.count),
              secondary: t("stats.compare.share", { percent: percent(rarity.count, totals.cardCount) }),
              swatch: rarity.color,
            }))}
          />
        </StatsSection>
      ) : null}

      {breakdown && breakdown.colors.length > 0 ? (
        <StatsSection title={t("stats.colors.title")}>
          <BarList
            items={breakdown.colors.map((color) => ({
              key: color.key,
              label: color.label,
              value: color.count,
              display: number(color.count),
              secondary: t("stats.compare.share", { percent: percent(color.count, totals.cardCount) }),
              swatch: color.color,
            }))}
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
          />
        </StatsSection>
      ) : null}

      <StatsTopCards cards={report.topCards} />
    </View>
  );
}
