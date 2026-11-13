import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActivePresetWorkflow } from "@/features/bins/api/use-active-preset-workflow";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import { PresetStageMoveDialog } from "@/features/bins/components/preset-stage-dialogs";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { presetWorkflowPath } from "@/lib/constants/bins";
import type { PresetWorkflowStepMove } from "@/lib/interfaces/bins";
import {
  IconArrowLeft,
  IconArrowRight,
  IconListNumbers,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PresetStageControl() {
  const { t } = useTranslation("bins");
  const { isPresetMutating } = useBinConfigs();
  const { isEntering } = usePresetWorkflows();
  const { isTimerActive } = useScannedCards();
  const { workflow, stageNumber, stageCount, previousStep, nextStep, label } =
    useActivePresetWorkflow();
  const [move, setMove] = useState<PresetWorkflowStepMove | null>(null);

  if (!workflow) return null;

  const isDisabled = isPresetMutating || isEntering || isTimerActive;

  const controls = (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {previousStep && (
        <Button
          type="button"
          variant="outline"
          disabled={isDisabled}
          onClick={() => setMove({ workflow, step: previousStep })}
        >
          <IconArrowLeft /> {t("presetWorkflows.previousStage")}
        </Button>
      )}
      {nextStep ? (
        <Button
          type="button"
          disabled={isDisabled}
          onClick={() => setMove({ workflow, step: nextStep })}
        >
          {t("presetWorkflows.nextStage")}{" "}
          <IconArrowRight />
        </Button>
      ) : (
        <span className="text-xs text-foreground/70">
          {t("presetWorkflows.lastStage")}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-none flex-col gap-2 rounded-card bg-card p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="text-xs text-foreground/70">
            {t("presetWorkflows.stageOf", {
              number: stageNumber,
              count: stageCount,
            })}
          </span>
        </div>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link to={presetWorkflowPath(workflow.guid)} />}
        >
          <IconListNumbers /> {t("presetWorkflows.editStages")}
        </Button>
      </div>
      {isTimerActive ? (
        <Tooltip>
          <TooltipTrigger render={<div />}>
            {controls}
            <span className="sr-only">{t("presetWorkflows.stopFirst")}</span>
          </TooltipTrigger>
          <TooltipContent>{t("presetWorkflows.stopFirst")}</TooltipContent>
        </Tooltip>
      ) : (
        controls
      )}
      <PresetStageMoveDialog move={move} onClose={() => setMove(null)} />
    </div>
  );
}
