import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";

export function StatTileSkeleton() {
  const colors = useTheme();
  return (
    <View
      style={{
        width: "50%",
        padding: SPACING.md,
        gap: SPACING.sm,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Skeleton width="50%" height={12} />
      <Skeleton width="70%" height={22} />
      <Skeleton width="60%" height={10} />
    </View>
  );
}
