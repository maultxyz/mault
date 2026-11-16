import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  activeWorkflowForGame,
  activeWorkflowStep,
  nextWorkflowStep,
  previousWorkflowStep,
  workflowStepLabel,
  workflowStepNumber,
} from "@magic-vault/shared";
import { presetWorkflowsQueryOptions } from "@/features/rules/api/preset-workflows";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useActiveOrgId } from "@/hooks/use-org";
import type { ActivePresetWorkflowState } from "@/lib/interfaces/rules";

export function useActivePresetWorkflow(): ActivePresetWorkflowState {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const {
    sets,
    activeSet,
    gameGuid,
    isPending: isRulesDataPending,
    isError: isRulesDataError,
    isRefetching: isRefetchingRulesData,
    refetch: refetchRulesData,
  } = useRulesData();
  const workflowsQuery = useQuery(presetWorkflowsQueryOptions(orgId));
  const allWorkflows = workflowsQuery.data ?? [];
  const isPending = isRulesDataPending || workflowsQuery.isLoading;
  const isError = isRulesDataError || workflowsQuery.isError;
  const isRefetching = isRefetchingRulesData || workflowsQuery.isRefetching;
  const refetch = () => Promise.all([refetchRulesData(), workflowsQuery.refetch()]);
  const workflows = allWorkflows.filter((workflow) => workflow.gameGuid === (gameGuid ?? null));
  const candidate = activeWorkflowForGame(allWorkflows, gameGuid);
  const step = activeWorkflowStep(candidate);
  const workflow = step && activeSet?.isActive && step.presetGuid === activeSet.guid ? candidate : null;
  const presetName = (presetGuid: string) =>
    sets.find((preset) => preset.guid === presetGuid)?.name ?? t("rules.stages.missingPreset");

  if (!workflow || !step) {
    return {
      workflows,
      workflow: null,
      step: null,
      stageNumber: 0,
      stageCount: 0,
      previousStep: null,
      nextStep: null,
      label: "",
      presetName,
      isPending,
      isError,
      isRefetching,
      refetch,
    };
  }
  return {
    workflows,
    workflow,
    step,
    stageNumber: workflowStepNumber(workflow, step),
    stageCount: workflow.steps.length,
    previousStep: previousWorkflowStep(workflow, step),
    nextStep: nextWorkflowStep(workflow, step),
    label: workflowStepLabel(workflow, step, presetName),
    presetName,
    isPending,
    isError,
    isRefetching,
    refetch,
  };
}
