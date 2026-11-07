import { View } from "react-native";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { SPACING } from "@/lib/constants/theme";
import type { PageSkeletonProps } from "@/lib/interfaces/ui";

export function PageSkeleton({ sections = 2 }: PageSkeletonProps) {
  return (
    <View style={{ gap: SPACING.xl }}>
      <Skeleton width="80%" height={14} />
      {Array.from({ length: sections }).map((_, index) => (
        <View key={index} style={{ gap: SPACING.sm }}>
          <Skeleton width={120} height={12} />
          <ListSkeleton rows={index === 0 ? 3 : 2} />
        </View>
      ))}
    </View>
  );
}
