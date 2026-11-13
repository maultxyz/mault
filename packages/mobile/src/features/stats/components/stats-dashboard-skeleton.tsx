import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatGroup } from "@/components/ui/stat-group";
import { Surface } from "@/components/ui/surface";
import { StatTileSkeleton } from "@/components/ui/stat-tile-skeleton";
import { useTheme } from "@/hooks/use-theme";
import {
  STATS_AREA_CHART,
  STATS_CHART_HEIGHT,
  STATS_HISTOGRAM_COLUMN_GAP,
  STATS_SKELETON_BODY_LINE_HEIGHT,
  STATS_SKELETON_HERO_HEIGHT,
  STATS_SKELETON_HIGHLIGHT_COUNT,
  STATS_SKELETON_PRICE_COLUMN_FRACTIONS,
  STATS_SKELETON_TAB_STRIP_HEIGHT,
  STATS_SKELETON_TILE_COUNT,
} from "@/lib/constants/stats";
import { FONT_SIZE, RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { ICON_BADGE_SIZE } from "@/lib/constants/ui";
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

function HighlightTileSkeleton() {
  const colors = useTheme();
  return (
    <View style={{ width: "50%", paddingHorizontal: SPACING.xs }}>
      <View style={{ padding: SPACING.lg, gap: SPACING.md, borderRadius: SURFACE_RADIUS, backgroundColor: colors.card }}>
        <Skeleton width={ICON_BADGE_SIZE} height={ICON_BADGE_SIZE} radius={RADIUS.full} />
        <View style={{ gap: SPACING.xs }}>
          <Skeleton width="70%" height={FONT_SIZE.sm} />
          <Skeleton width="90%" height={FONT_SIZE["2xs"]} />
        </View>
      </View>
    </View>
  );
}

export function StatsDashboardSkeleton() {
  const { t } = useTranslation();
  return (
    <View style={{ gap: SPACING.lg + SPACING.xs }}>
      <Skeleton height={STATS_SKELETON_HERO_HEIGHT} radius={SURFACE_RADIUS} />
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("stats.highlights.title")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -SPACING.xs, rowGap: SPACING.sm }}>
          {Array.from({ length: STATS_SKELETON_HIGHLIGHT_COUNT }).map((_, index) => (
            <HighlightTileSkeleton key={index} />
          ))}
        </View>
      </View>
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
        <View style={{ gap: SPACING.sm }}>
          <TextLineSkeleton width="55%" />
          <View
            style={{
              height: STATS_CHART_HEIGHT,
              flexDirection: "row",
              alignItems: "flex-end",
              gap: STATS_HISTOGRAM_COLUMN_GAP,
            }}
          >
            {STATS_SKELETON_PRICE_COLUMN_FRACTIONS.map((fraction, index) => (
              <View key={index} style={{ flex: 1 }}>
                <Skeleton height={Math.round(STATS_CHART_HEIGHT * fraction)} radius={RADIUS.sm} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: STATS_HISTOGRAM_COLUMN_GAP }}>
            {STATS_SKELETON_PRICE_COLUMN_FRACTIONS.map((_, index) => (
              <View key={index} style={{ flex: 1 }}>
                <Skeleton height={FONT_SIZE["2xs"]} />
              </View>
            ))}
          </View>
        </View>
      </SectionSkeleton>
    </View>
  );
}
