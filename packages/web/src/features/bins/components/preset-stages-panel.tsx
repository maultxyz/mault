import { Button } from "@/components/ui/button";
import { useActivePresetWorkflow } from "@/features/bins/api/use-active-preset-workflow";
import { presetWorkflowPath } from "@/lib/constants/bins";
import { IconListNumbers } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PresetStagesPanel() {
  const { t } = useTranslation("bins");
  const { workflow, stageNumber, stageCount, label } =
    useActivePresetWorkflow();

  if (!workflow) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-card p-3">
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
        variant="outline"
        nativeButton={false}
        render={<Link to={presetWorkflowPath(workflow.guid)} />}
      >
        <IconListNumbers /> {t("presetWorkflows.editStages")}
      </Button>
    </div>
  );
}
