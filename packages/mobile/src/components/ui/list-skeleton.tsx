import { Fragment } from "react";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE, LIST_ROW_MIN_HEIGHT, LIST_SKELETON_TITLE_WIDTHS } from "@/lib/constants/ui";
import type { ListSkeletonProps } from "@/lib/interfaces/ui";

export function ListSkeleton({ rows = 3, withIcon = true }: ListSkeletonProps) {
  const colors = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: SURFACE_RADIUS, paddingVertical: 4 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Fragment key={index}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.md,
              minHeight: LIST_ROW_MIN_HEIGHT,
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.sm,
            }}
          >
            {withIcon ? <Skeleton width={LIST_ROW_ICON_SIZE} height={LIST_ROW_ICON_SIZE} radius={RADIUS.full} /> : null}
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={LIST_SKELETON_TITLE_WIDTHS[index % LIST_SKELETON_TITLE_WIDTHS.length]} height={14} />
            </View>
            <Skeleton width={48} height={12} />
          </View>
        </Fragment>
      ))}
    </View>
  );
}
