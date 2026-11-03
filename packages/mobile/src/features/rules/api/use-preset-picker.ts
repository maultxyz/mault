import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { binSetMode, firstWorkflowStep } from "@magic-vault/shared";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { activateBinSet } from "@/features/rules/api/bin-sets";
import { presetWorkflowsQueryOptions } from "@/features/rules/api/preset-workflows";
import { useActivePresetWorkflow } from "@/features/rules/api/use-active-preset-workflow";
import { usePresetStageMoves } from "@/features/rules/api/use-preset-stage-moves";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useActiveOrgId } from "@/hooks/use-org";
import { PRESET_OPTION_PREFIX, WORKFLOW_OPTION_PREFIX } from "@/lib/constants/rules";
import type { OptionItem } from "@/lib/interfaces/ui";

export function usePresetPicker() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { sets, activeSet } = useRulesData();
  const active = useActivePresetWorkflow();
  const moves = usePresetStageMoves();
  const activate = useMutation({
    mutationFn: activateBinSet,
    onSuccess: (next) => {
      queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next);
      void queryClient.invalidateQueries({ queryKey: presetWorkflowsQueryOptions(orgId).queryKey });
    },
  });

  const items = [
    ...sets.map((preset) => ({
      value: `${PRESET_OPTION_PREFIX}${preset.guid}`,
      name: preset.name,
      suffix: binSetMode(preset) === "rules" ? null : t(`rules.modes.${binSetMode(preset)}.title`),
    })),
    ...active.workflows.map((workflow) => ({
      value: `${WORKFLOW_OPTION_PREFIX}${workflow.guid}`,
      name: workflow.name,
      suffix: t("rules.stages.badge"),
    })),
  ];
  const options: OptionItem[] = items.map((item) => ({
    value: item.value,
    label: item.suffix ? `${item.name} \u00b7 ${item.suffix}` : item.name,
  }));
  const selectedValue = active.workflow
    ? `${WORKFLOW_OPTION_PREFIX}${active.workflow.guid}`
    : activeSet?.isActive
      ? `${PRESET_OPTION_PREFIX}${activeSet.guid}`
      : null;

  return {
    options,
    selected: selectedValue ? [selectedValue] : [],
    label: active.workflow ? active.label : activeSet?.isActive ? activeSet.name : null,
    isPending: activate.isPending || moves.isPending,
    isError: activate.isError || moves.isError,
    choose: (value: string) => {
      if (value === selectedValue) return;
      if (value.startsWith(WORKFLOW_OPTION_PREFIX)) {
        const workflow = active.workflows.find(
          (candidate) => candidate.guid === value.slice(WORKFLOW_OPTION_PREFIX.length),
        );
        const first = workflow ? firstWorkflowStep(workflow) : undefined;
        if (workflow && first) moves.start(workflow, first);
        return;
      }
      activate.mutate(value.slice(PRESET_OPTION_PREFIX.length));
    },
  };
}
