import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { BottomActionBarProps } from "@/lib/interfaces/ui";

export function BottomActionBar({ children, direction = "column" }: BottomActionBarProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: direction,
        gap: SPACING.sm,
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.md + insets.bottom,
        backgroundColor: colors.background,
      }}
    >
      {children}
    </View>
  );
}
