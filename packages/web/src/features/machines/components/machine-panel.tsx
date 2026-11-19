import { MachineBinGrid } from "@/features/machines/components/machine-bin-grid";
import { MachineCameraView } from "@/features/machines/components/machine-camera-view";
import { MachinePresetRow } from "@/features/machines/components/machine-preset-row";
import { MachineRecentCards } from "@/features/machines/components/machine-recent-cards";
import { MachineStatusSummary } from "@/features/machines/components/machine-status-summary";
import type { MachinePanelSectionProps } from "@/lib/interfaces/machines";
import { useTranslation } from "react-i18next";

export function MachinePanel({ machine, showsName }: MachinePanelSectionProps) {
  const { t } = useTranslation("machines");

  return (
    <article
      aria-label={machine.name}
      className="flex min-w-0 flex-col gap-4 md:gap-2"
    >
      {showsName && (
        <h2 className="truncate font-heading text-base font-semibold text-foreground">{machine.name}</h2>
      )}
      <MachineCameraView machine={machine} />
      <MachineStatusSummary machine={machine} />
      {(machine.canEmergencyStop || machine.canPause || machine.canResume) && (
        <p className="text-xs text-foreground/70">{t("controls.remoteNote")}</p>
      )}
      <MachinePresetRow machine={machine} />
      <MachineRecentCards machine={machine} />
      <MachineBinGrid machine={machine} />
    </article>
  );
}
