import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { MULTILINE_INPUT_MIN_HEIGHT } from "@/lib/constants/ui";

export function MultilineFieldSkeleton() {
  return (
    <View style={{ gap: SPACING.xs + 2 }}>
      <Skeleton width={96} height={12} />
      <Skeleton height={MULTILINE_INPUT_MIN_HEIGHT} radius={RADIUS.md} />
    </View>
  );
}
