import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLineSkeleton } from "@/components/ui/text-line-skeleton";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { ICON_BADGE_SIZE } from "@/lib/constants/ui";
import type { StatTileSkeletonProps } from "@/lib/interfaces/ui";

export function StatTileSkeleton({ hasIcon = true, hasHint = true }: StatTileSkeletonProps) {
  const colors = useTheme();
  return (
    <View style={{ width: "50%", paddingHorizontal: SPACING.xs }}>
      <View style={{ padding: SPACING.lg, gap: SPACING.md, borderRadius: SURFACE_RADIUS, backgroundColor: colors.card }}>
        {hasIcon ? <Skeleton width={ICON_BADGE_SIZE} height={ICON_BADGE_SIZE} radius={RADIUS.full} /> : null}
        <View style={{ gap: 2 }}>
          <TextLineSkeleton size="xs" width="50%" />
          <TextLineSkeleton size="2xl" heading width="70%" />
          {hasHint ? <TextLineSkeleton size="xs" width="60%" /> : null}
        </View>
      </View>
    </View>
  );
}
