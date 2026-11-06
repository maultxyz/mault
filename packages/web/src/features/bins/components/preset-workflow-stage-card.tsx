import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import { sortingRulesPresetPath } from "@/lib/constants/bins";
import type { PresetWorkflowStageCardProps } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PresetWorkflowStageCard({
  workflow,
  control,
  index,
  stageCount,
  isDirty,
  onSwitch,
  onMove,
  onRemove,
}: PresetWorkflowStageCardProps) {
  const { t } = useTranslation("bins");
  const { sets } = useBinConfigs();
  const { isEntering } = usePresetWorkflows();
  const stage = useWatch({ control, name: `stages.${index}` });
  const preset = sets.find((candidate) => candidate.guid === stage?.presetGuid);
  const savedStep = workflow.steps.find((step) => step.guid === stage?.stepGuid);
  const isCurrent =
    !!savedStep && workflow.isActive && workflow.activeStepGuid === savedStep.guid;
  const bins = (preset?.bins ?? [])
    .filter((bin) => !bin.isDisabled)
    .sort((a, b) => a.binNumber - b.binNumber);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg ring-1",
        isCurrent ? "ring-primary" : "ring-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b bg-sidebar px-3 py-2">
        <Badge variant="outline">
          {t("presetWorkflows.stageHeading", { number: index + 1 })}
        </Badge>
        <Controller
          control={control}
          name={`stages.${index}.presetGuid`}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(presetGuid) => presetGuid && field.onChange(presetGuid)}
            >
              <SelectTrigger
                className="w-full max-w-72 min-w-0 flex-1"
                aria-label={t("presetWorkflows.stageHeading", {
                  number: index + 1,
                })}
              >
                <SelectValue>
                  {preset?.name ?? t("presetWorkflows.missingPreset")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sets.map((candidate) => (
                  <SelectItem key={candidate.guid} value={candidate.guid}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {isCurrent && (
          <Badge variant="success">{t("presetWorkflows.current")}</Badge>
        )}
        {index > 0 && (
          <Controller
            control={control}
            name={`stages.${index}.isResortMode`}
            render={({ field }) => (
              <label className="flex items-center gap-1.5 text-control">
                <Switch
                  aria-label={t("presetWorkflows.resort")}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                {t("presetWorkflows.resort")}
              </label>
            )}
          />
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("presetWorkflows.moveUp")}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <IconArrowUp />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("presetWorkflows.moveDown")}
            disabled={index === stageCount - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <IconArrowDown />
          </Button>
          {preset && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={sortingRulesPresetPath(preset.guid)} />}
            >
              <IconEdit /> {t("presetWorkflows.editRules")}
            </Button>
          )}
          {!isCurrent && (
            <Button
              variant="outline"
              disabled={isEntering || isDirty || !savedStep || !preset}
              title={isDirty ? t("presetWorkflows.saveFirst") : undefined}
              onClick={() => savedStep && onSwitch({ workflow, step: savedStep })}
            >
              {t("presetWorkflows.switchHere")} <IconArrowRight />
            </Button>
          )}
          <Button
            variant="outline-destructive"
            size="icon"
            aria-label={t("presetWorkflows.removeStage")}
            disabled={stageCount <= 1}
            onClick={() => onRemove(index)}
          >
            <IconTrash />
          </Button>
        </div>
      </div>
      {!preset ? (
        <p className="px-3 py-2 text-xs text-foreground/70">
          {t("presetWorkflows.missingPresetDescription")}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {bins.map((bin) => (
            <div key={bin.binNumber} className="flex items-center gap-3 px-3 py-1.5">
              <span className="w-14 shrink-0 text-xs font-medium">
                {t("binLabel", { number: bin.binNumber })}
              </span>
              <div className="min-w-0 flex-1">
                {bin.isCatchAll ? (
                  <p className="text-xs text-foreground/70">{t("catchAll")}</p>
                ) : (
                  <RuleSummary rules={bin.rules} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
