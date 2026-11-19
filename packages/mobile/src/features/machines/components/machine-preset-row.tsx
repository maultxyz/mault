import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Surface } from "@/components/ui/surface";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { MachinePanelProps } from "@/lib/interfaces/machines";

export function MachinePresetRow({ machine }: MachinePanelProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <Surface>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
        <Icon name="rules" size={20} color={colors.foregroundSecondary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText size="xs" tone="secondary">
            {t("machines.preset.label")}
          </AppText>
          <AppText size="sm" weight="semibold" numberOfLines={1}>
            {machine.presetName ?? t("machines.preset.none")}
          </AppText>
        </View>
        {machine.workflowStep ? (
          <AppText size="xs" tone="secondary">
            {t("machines.preset.pass", {
              position: machine.workflowStep.position,
              count: machine.workflowStep.stepCount,
            })}
          </AppText>
        ) : null}
      </View>
    </Surface>
  );
}
