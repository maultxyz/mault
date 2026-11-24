import { View } from "react-native";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { BADGE_RADIUS, FONT_SIZE, SPACING } from "@/lib/constants/theme";
import { PILL_MIN_HEIGHT } from "@/lib/constants/ui";
import type { TradeOfferReviewSkeletonProps } from "@/lib/interfaces/trade-offers";

export function TradeOfferReviewSkeleton({ hasValueSummary }: TradeOfferReviewSkeletonProps) {
  return (
    <>
      <Skeleton width={80} height={PILL_MIN_HEIGHT + 2} radius={BADGE_RADIUS} />
      <View style={{ gap: SPACING.xs }}>
        <Skeleton width="75%" height={FONT_SIZE.sm} />
        <Skeleton width="55%" height={FONT_SIZE.sm} />
      </View>
      {hasValueSummary ? (
        <Surface style={{ flexDirection: "row", gap: SPACING.md }}>
          {Array.from({ length: 2 }).map((_, index) => (
            <View key={index} style={{ flex: 1, gap: SPACING.xs }}>
              <Skeleton width="60%" height={FONT_SIZE.xs} />
              <Skeleton width="45%" height={FONT_SIZE.lg} />
            </View>
          ))}
        </Surface>
      ) : null}
      <SectionSkeleton titleWidth={120}>
        <Surface style={{ gap: SPACING.xs }}>
          <Skeleton width="40%" height={FONT_SIZE.base} />
          <Skeleton width="60%" height={FONT_SIZE.sm} />
        </Surface>
      </SectionSkeleton>
      <SectionSkeleton titleWidth={120}>
        <ListSkeleton rows={3} leading="thumbnail" hasSubtitle />
      </SectionSkeleton>
    </>
  );
}
