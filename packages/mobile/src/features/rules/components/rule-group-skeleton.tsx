import { View } from "react-native";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { FONT_SIZE, SPACING } from "@/lib/constants/theme";
import type { RuleGroupSkeletonProps } from "@/lib/interfaces/rules";

export function RuleGroupSkeleton({ rows }: RuleGroupSkeletonProps) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <Skeleton width="60%" height={FONT_SIZE.base} />
      <ListSkeleton rows={rows} leading="none" hasSubtitle hasTrailing={false} />
    </View>
  );
}
