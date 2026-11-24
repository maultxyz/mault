import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTROL_RADIUS, SPACING } from "@/lib/constants/theme";
import { INPUT_HEIGHT } from "@/lib/constants/ui";
import type { FormSkeletonProps } from "@/lib/interfaces/ui";

export function FormSkeleton({ fields = 3 }: FormSkeletonProps) {
  return (
    <View style={{ gap: SPACING.lg }}>
      {Array.from({ length: fields }).map((_, index) => (
        <View key={index} style={{ gap: SPACING.sm }}>
          <Skeleton width={96} height={12} />
          <Skeleton height={INPUT_HEIGHT} radius={CONTROL_RADIUS} />
        </View>
      ))}
    </View>
  );
}
