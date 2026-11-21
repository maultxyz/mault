import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";
import { CONTROL_RADIUS, SPACING } from "@/lib/constants/theme";
import type { StepperRowProps } from "@/lib/interfaces/ui";

export function StepperRow({ value, min, max, bigStep, smallStep, disabled = false, valueLabel, onChange }: StepperRowProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const clamp = (next: number) => Math.max(min, max != null ? Math.min(max, next) : next);
  const atMin = value <= min;
  const atMax = max != null && value >= max;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
      <Button size="sm" variant="secondary" label={`-${bigStep}`} accessibilityLabel={t("common.decreaseBy", { step: bigStep })} disabled={disabled || atMin} onPress={() => onChange(clamp(value - bigStep))} />
      <Button size="sm" variant="secondary" label="-" accessibilityLabel={t("common.decreaseBy", { step: smallStep })} disabled={disabled || atMin} onPress={() => onChange(clamp(value - smallStep))} />
      <View
        accessible
        accessibilityLiveRegion="polite"
        style={{
          flex: 1,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: CONTROL_RADIUS,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <AppText size="xs" weight="semibold">
          {valueLabel}
        </AppText>
      </View>
      <Button size="sm" variant="secondary" label="+" accessibilityLabel={t("common.increaseBy", { step: smallStep })} disabled={disabled || atMax} onPress={() => onChange(clamp(value + smallStep))} />
      <Button size="sm" variant="secondary" label={`+${bigStep}`} accessibilityLabel={t("common.increaseBy", { step: bigStep })} disabled={disabled || atMax} onPress={() => onChange(clamp(value + bigStep))} />
    </View>
  );
}
