import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Slider } from "@/components/ui/slider";
import { SPACING } from "@/lib/constants/theme";
import type { SliderFieldProps } from "@/lib/interfaces/ui";

export function SliderField({ label, description, valueLabel, children, ...slider }: SliderFieldProps) {
  return (
    <View style={{ gap: SPACING.xs }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: SPACING.sm }}>
        <AppText size="xs" weight="medium" style={{ flex: 1 }}>
          {label}
        </AppText>
        <AppText size="xs" weight="semibold" style={{ fontVariant: ["tabular-nums"] }}>
          {valueLabel}
        </AppText>
      </View>
      {description ? (
        <AppText size="xs" tone="secondary">
          {description}
        </AppText>
      ) : null}
      <Slider {...slider} />
      {children}
    </View>
  );
}
