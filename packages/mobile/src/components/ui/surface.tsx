import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { SurfaceProps } from "@/lib/interfaces/ui";

export function Surface({ children, style, padded = true }: SurfaceProps) {
  const colors = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: SURFACE_RADIUS,
          borderCurve: "continuous",
          padding: padded ? SPACING.lg + 2 : 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
