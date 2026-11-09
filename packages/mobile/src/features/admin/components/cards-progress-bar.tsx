import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import type { CardsProgressBarProps } from "@/lib/interfaces/admin-cards";

export function CardsProgressBar({ accessibilityLabel, done, total }: CardsProgressBarProps) {
  const colors = useTheme();
  const percent = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={{ height: 8, borderRadius: RADIUS.full, backgroundColor: colors.muted, overflow: "hidden" }}
    >
      <View style={{ height: "100%", width: `${percent}%`, backgroundColor: colors.foreground }} />
    </View>
  );
}
