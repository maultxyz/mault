import { View } from "react-native";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import {
  FEATURE_HIGHLIGHT_MEDIA_ASPECT_RATIO,
  FEATURE_HIGHLIGHT_TIMELINE_SKELETON_ROWS,
} from "@/lib/constants/feature-highlights";
import { FONT_SIZE, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";

export function FeatureHighlightTimelineSkeleton() {
  return (
    <SectionSkeleton titleWidth={120}>
      <View style={{ gap: SPACING.sm }}>
        {Array.from({ length: FEATURE_HIGHLIGHT_TIMELINE_SKELETON_ROWS }).map((_, index) => (
          <Surface key={index} style={{ gap: SPACING.lg }}>
            <Skeleton width={96} height={FONT_SIZE.xs} />
            <View style={{ gap: SPACING.md }}>
              <View style={{ aspectRatio: FEATURE_HIGHLIGHT_MEDIA_ASPECT_RATIO, borderRadius: SURFACE_RADIUS, overflow: "hidden" }}>
                <Skeleton height="100%" radius={0} />
              </View>
              <View style={{ gap: SPACING.xs }}>
                <Skeleton width="60%" height={FONT_SIZE.base} />
                <Skeleton width="95%" height={FONT_SIZE.sm} />
                <Skeleton width="80%" height={FONT_SIZE.sm} />
              </View>
            </View>
          </Surface>
        ))}
      </View>
    </SectionSkeleton>
  );
}
