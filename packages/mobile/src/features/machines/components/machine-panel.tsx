import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { MachineBinGrid } from "@/features/machines/components/machine-bin-grid";
import { MachineCameraView } from "@/features/machines/components/machine-camera-view";
import { MachinePresetRow } from "@/features/machines/components/machine-preset-row";
import { MachineRecentCards } from "@/features/machines/components/machine-recent-cards";
import { MachineStatusSummary } from "@/features/machines/components/machine-status-summary";
import { SPACING } from "@/lib/constants/theme";
import type { MachinePanelSectionProps } from "@/lib/interfaces/machines";

export function MachinePanel({ machine, showsName, isVisible }: MachinePanelSectionProps) {
  const { t } = useTranslation();
  const hasControls = machine.canEmergencyStop || machine.canPause || machine.canResume;

  return (
    <View style={{ gap: SPACING.lg }}>
      {showsName ? (
        <AppText size="lg" heading weight="semibold" accessibilityRole="header" numberOfLines={1}>
          {machine.name}
        </AppText>
      ) : null}
      <MachineCameraView machine={machine} isVisible={isVisible} />
      <MachineStatusSummary machine={machine} />
      {hasControls ? (
        <AppText size="xs" tone="secondary">
          {t("machines.controls.remoteNote")}
        </AppText>
      ) : null}
      <MachinePresetRow machine={machine} />
      <MachineRecentCards machine={machine} />
      <MachineBinGrid machine={machine} />
    </View>
  );
}
