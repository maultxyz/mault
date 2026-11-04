import {
  createPresetWorkflow,
  deletePresetWorkflow,
  enterPresetWorkflowStep,
  presetWorkflowsQueryKey,
  presetWorkflowsQueryOptions,
  savePresetWorkflowStages,
  updatePresetWorkflow,
} from "@/features/bins/api/preset-workflows";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import {
  activeWorkflowForGame,
  firstWorkflowStep,
  type PresetWorkflow,
  type PresetWorkflowStageInput,
  type PresetWorkflowStep,
  type Result,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function usePresetWorkflows() {
  const { t } = useTranslation("bins");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const { activeCollection } = useCollections();
  const gameGuid = activeCollection?.game?.guid ?? null;
  const { data: allWorkflows = [], isLoading } = useQuery({
    ...presetWorkflowsQueryOptions,
    enabled: !!activeOrg,
  });
  const workflows = allWorkflows.filter(
    (workflow) => workflow.gameGuid === gameGuid,
  );

  const applyWorkflows = (result: Result<PresetWorkflow[]>) => {
    if (result.success && result.data) {
      queryClient.setQueryData(presetWorkflowsQueryKey, result.data);
      return true;
    }
    toast.error(result.message || t("presetWorkflows.toasts.saveFailed"));
    return false;
  };
  const onError = () => toast.error(t("presetWorkflows.toasts.saveFailed"));

  const saveMutation = useMutation({
    mutationFn: (request: () => Promise<Result<PresetWorkflow[]>>) => request(),
    onError,
  });
  const save = async (request: () => Promise<Result<PresetWorkflow[]>>) => {
    const result = await saveMutation.mutateAsync(request).catch(() => null);
    return result ? applyWorkflows(result) : false;
  };

  const createMutation = useMutation({
    mutationFn: ({ name, firstPresetGuid }: { name: string; firstPresetGuid: string }) =>
      createPresetWorkflow(name, firstPresetGuid, gameGuid ?? undefined),
    onError,
  });

  const enterMutation = useMutation({
    mutationFn: ({
      workflow,
      step,
      markBinsEmptied,
    }: {
      workflow: PresetWorkflow;
      step: PresetWorkflowStep;
      markBinsEmptied: boolean;
    }) => enterPresetWorkflowStep(workflow.guid, step.guid, markBinsEmptied),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(presetWorkflowsQueryKey, result.data.workflows);
        queryClient.setQueryData(binsQueryOptions.queryKey, result.data.presets);
        return;
      }
      toast.error(result.message || t("presetWorkflows.toasts.switchFailed"));
    },
    onError: () => toast.error(t("presetWorkflows.toasts.switchFailed")),
  });

  const enterStep = async (
    workflow: PresetWorkflow,
    step: PresetWorkflowStep,
    markBinsEmptied = true,
  ) => {
    const result = await enterMutation
      .mutateAsync({ workflow, step, markBinsEmptied })
      .catch(() => null);
    return !!result?.success;
  };

  return {
    workflows,
    isLoading,
    activeWorkflow: activeWorkflowForGame(allWorkflows, gameGuid),
    isSaving: saveMutation.isPending || createMutation.isPending,
    isEntering: enterMutation.isPending,
    enterStep,
    start: (workflow: PresetWorkflow) => {
      const first = firstWorkflowStep(workflow);
      return first ? enterStep(workflow, first, false) : Promise.resolve(false);
    },
    create: async (name: string, firstPresetGuid: string) => {
      const result = await createMutation
        .mutateAsync({ name, firstPresetGuid })
        .catch(() => null);
      if (!result) return null;
      return applyWorkflows(result) ? (result.createdGuid ?? null) : null;
    },
    rename: (workflow: PresetWorkflow, name: string) =>
      save(() => updatePresetWorkflow(workflow.guid, { name })),
    remove: (workflow: PresetWorkflow) =>
      save(() => deletePresetWorkflow(workflow.guid)),
    saveStages: (workflow: PresetWorkflow, stages: PresetWorkflowStageInput[]) =>
      save(() => savePresetWorkflowStages(workflow.guid, stages)),
  };
}
