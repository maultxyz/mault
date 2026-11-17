import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import type { HomeActivityFigureProps } from "@/lib/interfaces/home";

export function HomeActivityFigure({ value, label, exactValue }: HomeActivityFigureProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${exactValue ?? value}`} style={{ gap: 2 }}>
      <AppText size="2xl" heading weight="bold" numberOfLines={1}>
        {value}
      </AppText>
      <AppText size="xs" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}
