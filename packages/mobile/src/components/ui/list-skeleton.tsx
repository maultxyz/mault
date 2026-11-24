import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_THUMBNAIL_RADIUS, RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import {
  LIST_ROW_ICON_SIZE,
  LIST_ROW_MIN_HEIGHT,
  LIST_SKELETON_SUBTITLE_WIDTHS,
  LIST_SKELETON_TITLE_WIDTHS,
} from "@/lib/constants/ui";
import type { ListSkeletonProps } from "@/lib/interfaces/ui";

export function ListSkeleton({
  rows = 3,
  leading = "icon",
  hasSubtitle = false,
  subtitleLines = 1,
  hasTrailing = true,
}: ListSkeletonProps) {
  const colors = useTheme();
  const shownSubtitleLines = hasSubtitle ? subtitleLines : 0;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: SURFACE_RADIUS, paddingVertical: 4 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING.md,
            minHeight: LIST_ROW_MIN_HEIGHT,
            paddingHorizontal: SPACING.lg,
            paddingVertical: SPACING.sm,
          }}
        >
          {leading === "icon" ? (
            <Skeleton width={LIST_ROW_ICON_SIZE} height={LIST_ROW_ICON_SIZE} radius={RADIUS.full} />
          ) : null}
          {leading === "thumbnail" ? (
            <Skeleton
              width={LIST_ROW_ICON_SIZE}
              height={LIST_ROW_ICON_SIZE / CARD_ASPECT_RATIO}
              radius={CARD_THUMBNAIL_RADIUS}
            />
          ) : null}
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={LIST_SKELETON_TITLE_WIDTHS[index % LIST_SKELETON_TITLE_WIDTHS.length]} height={14} />
            {Array.from({ length: shownSubtitleLines }).map((_, lineIndex) => (
              <Skeleton
                key={lineIndex}
                width={LIST_SKELETON_SUBTITLE_WIDTHS[(index + lineIndex) % LIST_SKELETON_SUBTITLE_WIDTHS.length]}
                height={12}
              />
            ))}
          </View>
          {hasTrailing ? <Skeleton width={48} height={12} /> : null}
        </View>
      ))}
    </View>
  );
}
