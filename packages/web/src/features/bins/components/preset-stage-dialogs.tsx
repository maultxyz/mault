import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import type { PresetStageMoveDialogProps } from "@/lib/interfaces/bins";
import { useTranslation } from "react-i18next";

export function PresetStageMoveDialog({
  move,
  onClose,
}: PresetStageMoveDialogProps) {
  const { t } = useTranslation("bins");
  const { sets } = useBinConfigs();
  const { enterStep, isEntering } = usePresetWorkflows();
  const name =
    sets.find((preset) => preset.guid === move?.step.presetGuid)?.name ??
    t("presetWorkflows.missingPreset");

  const confirmMove = async () => {
    if (!move) return;
    if (await enterStep(move.workflow, move.step)) onClose();
  };

  return (
    <DynamicDialog
      open={move !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("presetWorkflows.confirmMoveTitle", { name })}
      description={t("presetWorkflows.confirmMoveDescription", { name })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("presetSelector.cancel")}
          </Button>
          <Button disabled={isEntering} onClick={confirmMove}>
            {t("presetWorkflows.binsAreEmpty")}
          </Button>
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    />
  );
}
