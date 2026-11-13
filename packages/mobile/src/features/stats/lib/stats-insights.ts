import type { TFunction } from "i18next";
import type { StatsReport } from "@magic-vault/shared";
import { percent } from "@/features/stats/lib/stats-breakdown";
import { STATS_HIGH_VALUE_MIN_PRICE } from "@/lib/constants/stats";
import { formatDay } from "@/lib/dates";
import type { StatsInsight } from "@/lib/interfaces/stats";

export function buildStatsInsights(
  report: StatsReport,
  t: TFunction,
  formatPrice: (value: number) => string,
  locale: string,
): StatsInsight[] {
  const insights: StatsInsight[] = [];
  const { totals } = report;

  const topCard = report.topCards[0];
  if (topCard && topCard.price != null) {
    insights.push({
      key: "topCard",
      icon: "crown",
      title: t("stats.insights.topCard.title", { name: topCard.card.name }),
      detail: t("stats.insights.topCard.detail", { price: formatPrice(topCard.price), collection: topCard.collectionName }),
    });
  }

  const highValueBuckets = report.priceBuckets.filter((bucket) => bucket.min >= STATS_HIGH_VALUE_MIN_PRICE);
  const highValueCount = highValueBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const highValueTotal = highValueBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  if (highValueCount > 0 && totals.totalValue > 0) {
    insights.push({
      key: "highValue",
      icon: "coins",
      title: t("stats.insights.highValue.title", { count: highValueCount, percent: percent(highValueTotal, totals.totalValue) }),
      detail: t("stats.insights.highValue.detail", { min: formatPrice(STATS_HIGH_VALUE_MIN_PRICE) }),
    });
  }

  if (report.scope === "org" && report.collections.length > 1 && totals.totalValue > 0) {
    const topCollection = [...report.collections].sort((a, b) => b.totalValue - a.totalValue)[0];
    insights.push({
      key: "topCollection",
      icon: "collections",
      title: t("stats.insights.topCollection.title", { name: topCollection.name }),
      detail: t("stats.insights.topCollection.detail", { percent: percent(topCollection.totalValue, totals.totalValue) }),
    });
  }

  const busiest = report.activity.reduce<StatsReport["activity"][number] | null>(
    (best, bucket) => (bucket.count > (best?.count ?? 0) ? bucket : best),
    null,
  );
  if (busiest) {
    insights.push({
      key: "busiest",
      icon: "flame",
      title: t(`stats.insights.busiest.title.${report.bucket}`, { date: formatDay(busiest.start, locale) }),
      detail: t("stats.insights.busiest.detail", { count: busiest.count }),
    });
  }

  if (totals.needsReviewCount > 0) {
    insights.push({
      key: "review",
      icon: "help",
      title: t("stats.insights.review.title", { count: totals.needsReviewCount }),
      detail: t("stats.insights.review.detail"),
    });
  }

  return insights;
}

export function activityAverage(report: StatsReport): number {
  return report.activity.length > 0 ? report.totals.scansInRange / report.activity.length : 0;
}
