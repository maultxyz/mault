import { BUSINESS_OVERVIEW_SALES_DAYS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTileSkeleton } from "@/components/ui/stat-tile-skeleton";
import { StatsHighlightTileSkeleton, StatsSectionSkeleton } from "@/features/stats/components/stats-dashboard-skeleton";
import {
  BUSINESS_OVERVIEW_SKELETON_HIGHLIGHT_COUNT,
  BUSINESS_OVERVIEW_SKELETON_NOW_TILE_COUNT,
  BUSINESS_OVERVIEW_SKELETON_SALES_TILE_COUNT,
} from "@/lib/constants/business";
import { STATS_AREA_CHART } from "@/lib/constants/stats";
import { SPACING } from "@/lib/constants/theme";

export function BusinessOverviewSkeleton() {
  const { t } = useTranslation();
  return (
    <View style={{ gap: SPACING.xl }}>
      <StatGroup heading={t("business.overview.now.heading")}>
        {Array.from({ length: BUSINESS_OVERVIEW_SKELETON_NOW_TILE_COUNT }).map((_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </StatGroup>
      <StatGroup heading={t("business.overview.sales.heading", { days: BUSINESS_OVERVIEW_SALES_DAYS })}>
        {Array.from({ length: BUSINESS_OVERVIEW_SKELETON_SALES_TILE_COUNT }).map((_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </StatGroup>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("business.overview.attention.heading")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -SPACING.xs, rowGap: SPACING.sm }}>
          {Array.from({ length: BUSINESS_OVERVIEW_SKELETON_HIGHLIGHT_COUNT }).map((_, index) => (
            <StatsHighlightTileSkeleton key={index} />
          ))}
        </View>
      </View>
      <StatsSectionSkeleton title={t("business.overview.sales.title")}>
        <Skeleton height={STATS_AREA_CHART.height} />
      </StatsSectionSkeleton>
    </View>
  );
}
