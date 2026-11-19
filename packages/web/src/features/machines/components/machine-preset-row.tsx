import type { MachinePanelProps } from "@/lib/interfaces/machines";
import { IconArrowsSplit } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MachinePresetRow({ machine }: MachinePanelProps) {
  const { t } = useTranslation("machines");

  return (
    <div className="flex items-center gap-3 rounded-card bg-card px-3 py-2.5 md:p-2.5">
      <IconArrowsSplit aria-hidden className="size-5 shrink-0 text-foreground/70" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-foreground/70">{t("preset.label")}</span>
        <span className="truncate text-sm font-semibold text-foreground">
          {machine.presetName ?? t("preset.none")}
        </span>
      </div>
      {machine.workflowStep && (
        <span className="shrink-0 text-xs text-foreground/70">
          {t("preset.pass", {
            position: machine.workflowStep.position,
            count: machine.workflowStep.stepCount,
          })}
        </span>
      )}
    </div>
  );
}
