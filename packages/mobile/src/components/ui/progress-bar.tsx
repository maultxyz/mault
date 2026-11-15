import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { PROGRESS_BAR_HEIGHT } from "@/lib/constants/ui";
import type { ProgressBarProps } from "@/lib/interfaces/ui";

export function ProgressBar({ fraction, accessibilityValue }: ProgressBarProps) {
  const colors = useTheme();
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <View
      accessibilityRole={accessibilityValue ? "progressbar" : undefined}
      accessibilityValue={accessibilityValue}
      style={{ flex: 1, height: PROGRESS_BAR_HEIGHT, borderRadius: RADIUS.full, backgroundColor: colors.tonal, overflow: "hidden" }}
    >
      <View style={{ width: `${percent}%`, height: "100%", borderRadius: RADIUS.full, backgroundColor: colors.primary }} />
    </View>
  );
}
