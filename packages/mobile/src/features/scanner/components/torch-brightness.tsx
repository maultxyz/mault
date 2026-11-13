import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/hooks/use-theme";
import { TORCH_MIN_STRENGTH_PERCENT, TORCH_STRENGTH_STEP_PERCENT } from "@/lib/constants/scanner";
import { CONTROL_RADIUS, SPACING } from "@/lib/constants/theme";
import type { TorchControlProps } from "@/lib/interfaces/scanner";

export function TorchBrightness({ torch }: TorchControlProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  if (!torch.isOn || !torch.supportsStrength) return null;
  const percentLabel = `${torch.strengthPercent}%`;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: CONTROL_RADIUS,
        backgroundColor: colors.cameraScrim,
      }}
    >
      <Icon name="torchOn" size={16} color={colors.onCamera} />
      <View style={{ flex: 1 }}>
        <Slider
          value={torch.strengthPercent}
          min={TORCH_MIN_STRENGTH_PERCENT}
          max={100}
          step={TORCH_STRENGTH_STEP_PERCENT}
          accessibilityLabel={t("scan.torch.brightness")}
          accessibilityValueText={percentLabel}
          onValueChange={torch.setStrengthPercent}
        />
      </View>
      <AppText
        size="xs"
        weight="semibold"
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={{ color: colors.onCamera, minWidth: 40, textAlign: "right" }}
      >
        {percentLabel}
      </AppText>
    </View>
  );
}
