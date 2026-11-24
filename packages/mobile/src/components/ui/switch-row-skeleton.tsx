import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTROL_RADIUS, FONT_SIZE, SPACING } from "@/lib/constants/theme";
import { SWITCH_ROW_SKELETON_SWITCH_SIZE } from "@/lib/constants/ui";
import type { SwitchRowSkeletonProps } from "@/lib/interfaces/ui";

export function SwitchRowSkeleton({ hasDescription = false }: SwitchRowSkeletonProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
      <View style={{ flex: 1, gap: SPACING.xs }}>
        <Skeleton width="55%" height={FONT_SIZE.base} />
        {hasDescription ? <Skeleton width="85%" height={FONT_SIZE.xs} /> : null}
      </View>
      <Skeleton
        width={SWITCH_ROW_SKELETON_SWITCH_SIZE.width}
        height={SWITCH_ROW_SKELETON_SWITCH_SIZE.height}
        radius={CONTROL_RADIUS}
      />
    </View>
  );
}
