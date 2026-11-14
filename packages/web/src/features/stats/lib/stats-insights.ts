import type { StatsInsight } from "@/lib/interfaces/stats";
import { buildStatsInsightFacts, type StatsInsightFact, type StatsReport } from "@magic-vault/shared";
import { IconAlbum, IconCoins, IconCrown, IconFlame, IconHelpCircle } from "@tabler/icons-react";
import type { TFunction } from "i18next";

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function toInsight(fact: StatsInsightFact, t: TFunction<"stats">, formatPrice: (value: number) => string): StatsInsight {
  switch (fact.kind) {
    case "topCard":
      return {
        key: fact.kind,
        icon: IconCrown,
        title: t("insights.topCard.title", { name: fact.name }),
        detail: t("insights.topCard.detail", { price: formatPrice(fact.price), collection: fact.collectionName }),
      };
    case "highValue":
      return {
        key: fact.kind,
        icon: IconCoins,
        title: t("insights.highValue.title", { count: fact.count, percent: fact.percent }),
        detail: t("insights.highValue.detail", { min: formatPrice(fact.minPrice) }),
      };
    case "topCollection":
      return {
        key: fact.kind,
        icon: IconAlbum,
        title: t("insights.topCollection.title", { name: fact.name }),
        detail: t("insights.topCollection.detail", { percent: fact.percent }),
      };
    case "busiest":
      return {
        key: fact.kind,
        icon: IconFlame,
        title: t(`insights.busiest.title.${fact.bucket}`, { date: formatDay(fact.start) }),
        detail: t("insights.busiest.detail", { count: fact.count }),
      };
    case "review":
      return {
        key: fact.kind,
        icon: IconHelpCircle,
        title: t("insights.review.title", { count: fact.count }),
        detail: t("insights.review.detail"),
      };
  }
}

export function buildStatsInsights(
  report: StatsReport,
  t: TFunction<"stats">,
  formatPrice: (value: number) => string,
): StatsInsight[] {
  return buildStatsInsightFacts(report).map((fact) => toInsight(fact, t, formatPrice));
}
