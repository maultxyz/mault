import type { TFunction } from "i18next";
import { buildStatsInsightFacts, type StatsInsightFact, type StatsReport } from "@magic-vault/shared";
import { formatDay } from "@/lib/dates";
import type { StatsInsight } from "@/lib/interfaces/stats";

function toInsight(fact: StatsInsightFact, t: TFunction, formatPrice: (value: number) => string, locale: string): StatsInsight {
  switch (fact.kind) {
    case "topCard":
      return {
        key: fact.kind,
        icon: "crown",
        title: t("stats.insights.topCard.title", { name: fact.name }),
        detail: t("stats.insights.topCard.detail", { price: formatPrice(fact.price), collection: fact.collectionName }),
      };
    case "highValue":
      return {
        key: fact.kind,
        icon: "coins",
        title: t("stats.insights.highValue.title", { count: fact.count, percent: fact.percent }),
        detail: t("stats.insights.highValue.detail", { min: formatPrice(fact.minPrice) }),
      };
    case "topCollection":
      return {
        key: fact.kind,
        icon: "collections",
        title: t("stats.insights.topCollection.title", { name: fact.name }),
        detail: t("stats.insights.topCollection.detail", { percent: fact.percent }),
      };
    case "busiest":
      return {
        key: fact.kind,
        icon: "flame",
        title: t(`stats.insights.busiest.title.${fact.bucket}`, { date: formatDay(fact.start, locale) }),
        detail: t("stats.insights.busiest.detail", { count: fact.count }),
      };
    case "review":
      return {
        key: fact.kind,
        icon: "help",
        title: t("stats.insights.review.title", { count: fact.count }),
        detail: t("stats.insights.review.detail"),
      };
  }
}

export function buildStatsInsights(
  report: StatsReport,
  t: TFunction,
  formatPrice: (value: number) => string,
  locale: string,
): StatsInsight[] {
  return buildStatsInsightFacts(report).map((fact) => toInsight(fact, t, formatPrice, locale));
}
