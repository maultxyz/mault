import { View } from "react-native";
import { SectionHeaderSkeleton } from "@/components/ui/section-header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLineSkeleton } from "@/components/ui/text-line-skeleton";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { BADGE_RADIUS, CARD_THUMBNAIL_RADIUS, RADIUS, SCREEN_GUTTER, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE, LIST_ROW_MIN_HEIGHT, LIST_SKELETON_TITLE_WIDTHS, PILL_MIN_HEIGHT } from "@/lib/constants/ui";
import type { CardReservationGroupsSkeletonProps } from "@/lib/interfaces/card-reservations";

export function CardReservationGroupsSkeleton({ groupCount, cardsPerGroup }: CardReservationGroupsSkeletonProps) {
  const colors = useTheme();
  const rowStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: LIST_ROW_MIN_HEIGHT,
    paddingHorizontal: SCREEN_GUTTER,
    paddingVertical: SPACING.sm,
  } as const;
  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeaderSkeleton />
      <View style={{ gap: SPACING.md }}>
        {Array.from({ length: groupCount }).map((_, groupIndex) => (
          <View key={groupIndex} style={{ backgroundColor: colors.card, borderRadius: SURFACE_RADIUS, paddingVertical: 4 }}>
            <View style={rowStyle}>
              <Skeleton width={LIST_ROW_ICON_SIZE} height={LIST_ROW_ICON_SIZE} radius={RADIUS.full} />
              <View style={{ flex: 1 }}>
                <TextLineSkeleton width={LIST_SKELETON_TITLE_WIDTHS[groupIndex % LIST_SKELETON_TITLE_WIDTHS.length]} />
                <TextLineSkeleton size="xs" width="70%" />
                <TextLineSkeleton size="xs" width="45%" />
              </View>
            </View>
            {Array.from({ length: cardsPerGroup }).map((_, cardIndex) => (
              <View key={cardIndex} style={rowStyle}>
                <Skeleton
                  width={LIST_ROW_ICON_SIZE}
                  height={LIST_ROW_ICON_SIZE / CARD_ASPECT_RATIO}
                  radius={CARD_THUMBNAIL_RADIUS}
                />
                <View style={{ flex: 1 }}>
                  <TextLineSkeleton width={LIST_SKELETON_TITLE_WIDTHS[(cardIndex + 1) % LIST_SKELETON_TITLE_WIDTHS.length]} />
                  <TextLineSkeleton size="xs" width="60%" />
                  <TextLineSkeleton size="xs" width="40%" />
                </View>
                <Skeleton width={64} height={PILL_MIN_HEIGHT} radius={BADGE_RADIUS} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
