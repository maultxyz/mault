import { CARD_REVIEW_SEARCH_PARAM } from "@/lib/constants/cards";
import { collectionViewPath, monitorCollectionPath } from "@/lib/constants/collections";
import { monitorCollectionCardPath, monitorCollectionReviewPath } from "@/lib/constants/scanner";
import type { StatsInsight } from "@/lib/interfaces/stats";
import { buildStatsInsightFacts, type StatsInsightFact, type StatsReport } from "@magic-vault/shared";
import { IconAlbum, IconCoins, IconCrown, IconFlame, IconHelpCircle } from "@tabler/icons-react";
import type { TFunction } from "i18next";

function formatDay(date: string, locale: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

function toInsight(
  fact: StatsInsightFact,
  t: TFunction<"stats">,
  formatPrice: (value: number) => string,
  locale: string,
  isMobile: boolean,
): StatsInsight {
  switch (fact.kind) {
    case "topCard":
      return {
        key: fact.kind,
        icon: IconCrown,
        to: isMobile
          ? monitorCollectionCardPath(fact.collectionGuid, fact.scanId)
          : `${collectionViewPath(fact.collectionGuid)}/cards/${fact.scanId}`,
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
        to: isMobile ? monitorCollectionPath(fact.collectionGuid) : collectionViewPath(fact.collectionGuid),
        title: t("insights.topCollection.title", { name: fact.name }),
        detail: t("insights.topCollection.detail", { percent: fact.percent }),
      };
    case "busiest":
      return {
        key: fact.kind,
        icon: IconFlame,
        title: t(`insights.busiest.title.${fact.bucket}`, { date: formatDay(fact.start, locale) }),
        detail: t("insights.busiest.detail", { count: fact.count }),
      };
    case "review":
      return {
        key: fact.kind,
        icon: IconHelpCircle,
        to: !fact.collectionGuidWithMostCardsToReview
          ? undefined
          : isMobile
            ? monitorCollectionReviewPath(fact.collectionGuidWithMostCardsToReview)
            : `${collectionViewPath(fact.collectionGuidWithMostCardsToReview)}?${CARD_REVIEW_SEARCH_PARAM}=1`,
        title: t("insights.review.title", { count: fact.count }),
        detail: t("insights.review.detail"),
      };
  }
}

export function buildStatsInsights(
  report: StatsReport,
  t: TFunction<"stats">,
  formatPrice: (value: number) => string,
  locale: string,
  isMobile: boolean,
): StatsInsight[] {
  return buildStatsInsightFacts(report).map((fact) => toInsight(fact, t, formatPrice, locale, isMobile));
}
