import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { SurfaceProps } from "@/lib/interfaces/ui";

export function Surface({ children, style, padded = true }: SurfaceProps) {
  const colors = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: colors.cardRing,
          padding: padded ? SPACING.lg : 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
