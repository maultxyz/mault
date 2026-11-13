import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatGroup } from "@/components/ui/stat-group";
import { Surface } from "@/components/ui/surface";
import { StatTileSkeleton } from "@/components/ui/stat-tile-skeleton";
import {
  STATS_AREA_CHART,
  STATS_SKELETON_HERO_HEIGHT,
  STATS_SKELETON_HIGHLIGHTS_HEIGHT,
  STATS_SKELETON_BAR_ROWS,
  STATS_SKELETON_BODY_LINE_HEIGHT,
  STATS_SKELETON_TAB_STRIP_HEIGHT,
  STATS_SKELETON_TILE_COUNT,
} from "@/lib/constants/stats";
import { FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import type { StatsSectionSkeletonProps, StatsTextLineSkeletonProps } from "@/lib/interfaces/stats";

function TextLineSkeleton({ width }: StatsTextLineSkeletonProps) {
  return (
    <View style={{ height: STATS_SKELETON_BODY_LINE_HEIGHT, justifyContent: "center" }}>
      <Skeleton width={width} height={FONT_SIZE.sm} />
    </View>
  );
}

function SectionSkeleton({ title, children }: StatsSectionSkeletonProps) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ gap: 2 }}>
        <SectionHeader title={title} />
        <TextLineSkeleton width="70%" />
      </View>
      <Surface style={{ gap: SPACING.md }}>{children}</Surface>
    </View>
  );
}

export function StatsDashboardSkeleton() {
  const { t } = useTranslation();
  return (
    <View style={{ gap: SPACING.xl }}>
      <Skeleton height={STATS_SKELETON_HERO_HEIGHT} radius={RADIUS.xl} />
      <Skeleton height={STATS_SKELETON_HIGHLIGHTS_HEIGHT} radius={RADIUS.lg} />
      <StatGroup heading={t("stats.tiles.heading")}>
        {Array.from({ length: STATS_SKELETON_TILE_COUNT }).map((_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </StatGroup>
      <SectionSkeleton title={t("stats.activity.title")}>
        <Skeleton width="60%" height={STATS_SKELETON_TAB_STRIP_HEIGHT} radius={RADIUS.full} />
        <View style={{ gap: SPACING.sm }}>
          <TextLineSkeleton width="45%" />
          <Skeleton height={STATS_AREA_CHART.height} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <TextLineSkeleton width={64} />
            <TextLineSkeleton width={48} />
          </View>
        </View>
      </SectionSkeleton>
      <SectionSkeleton title={t("stats.prices.title")}>
        <View style={{ gap: SPACING.xs }}>
          {Array.from({ length: STATS_SKELETON_BAR_ROWS }).map((_, index) => (
            <View key={index} style={{ gap: 6, paddingVertical: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: SPACING.md }}>
                <TextLineSkeleton width={index % 2 === 0 ? 120 : 96} />
                <TextLineSkeleton width={56} />
              </View>
              <Skeleton height={6} radius={RADIUS.full} width={`${90 - index * 15}%`} />
            </View>
          ))}
        </View>
      </SectionSkeleton>
    </View>
  );
}
