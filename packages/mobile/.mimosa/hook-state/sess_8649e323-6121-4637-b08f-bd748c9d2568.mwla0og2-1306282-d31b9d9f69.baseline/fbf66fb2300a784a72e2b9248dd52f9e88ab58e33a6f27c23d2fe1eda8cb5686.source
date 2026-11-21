import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { ICON_BADGE_SIZE } from "@/lib/constants/ui";

export function StatTileSkeleton() {
  const colors = useTheme();
  return (
    <View style={{ width: "50%", paddingHorizontal: SPACING.xs }}>
      <View style={{ padding: SPACING.lg, gap: SPACING.md, borderRadius: SURFACE_RADIUS, backgroundColor: colors.card }}>
        <Skeleton width={ICON_BADGE_SIZE} height={ICON_BADGE_SIZE} radius={RADIUS.full} />
        <View style={{ gap: SPACING.xs }}>
          <Skeleton width="50%" height={12} />
          <Skeleton width="70%" height={24} />
          <Skeleton width="60%" height={10} />
        </View>
      </View>
    </View>
  );
}
