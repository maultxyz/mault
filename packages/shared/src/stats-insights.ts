import { STATS_HIGH_VALUE_MIN_PRICE, STATS_SPARKLINE_MIN_POINTS } from "./constants/stats.constant";
import type { StatsActivityBucket, StatsInsightFact, StatsReport } from "./interfaces/stats.interface";

export function statsSharePercent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function statsActivityAverage(report: StatsReport): number {
  return report.activity.length > 0 ? report.totals.scansInRange / report.activity.length : 0;
}

export function statsHeroSparklineValues(report: StatsReport): number[] {
  const history = report.valueHistory ?? [];
  if (history.length >= STATS_SPARKLINE_MIN_POINTS) return history.map((point) => point.marketValue);
  let runningValue = 0;
  return report.activity.map((bucket) => (runningValue += bucket.value));
}

export function buildStatsInsightFacts(report: StatsReport): StatsInsightFact[] {
  const facts: StatsInsightFact[] = [];
  const { totals } = report;

  const topCard = report.topCards[0];
  if (topCard && topCard.price != null) {
    facts.push({ kind: "topCard", name: topCard.card.name, price: topCard.price, collectionName: topCard.collectionName });
  }

  const highValueBuckets = report.priceBuckets.filter((bucket) => bucket.min >= STATS_HIGH_VALUE_MIN_PRICE);
  const highValueCount = highValueBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const highValueTotal = highValueBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  if (highValueCount > 0 && totals.totalValue > 0) {
    facts.push({
      kind: "highValue",
      count: highValueCount,
      percent: statsSharePercent(highValueTotal, totals.totalValue),
      minPrice: STATS_HIGH_VALUE_MIN_PRICE,
    });
  }

  if (report.scope === "org" && report.collections.length > 1 && totals.totalValue > 0) {
    const topCollection = [...report.collections].sort((a, b) => b.totalValue - a.totalValue)[0];
    facts.push({
      kind: "topCollection",
      name: topCollection.name,
      percent: statsSharePercent(topCollection.totalValue, totals.totalValue),
    });
  }

  const busiest = report.activity.reduce<StatsActivityBucket | null>(
    (best, bucket) => (bucket.count > (best?.count ?? 0) ? bucket : best),
    null,
  );
  if (busiest) facts.push({ kind: "busiest", bucket: report.bucket, start: busiest.start, count: busiest.count });

  if (totals.needsReviewCount > 0) facts.push({ kind: "review", count: totals.needsReviewCount });

  return facts;
}
