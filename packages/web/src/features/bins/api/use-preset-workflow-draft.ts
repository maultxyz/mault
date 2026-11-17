import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import {
  presetWorkflowStagesSchema,
  type PresetWorkflowStagesFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  orderedWorkflowSteps,
  type PresetWorkflow,
} from "@magic-vault/shared";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";

export function usePresetWorkflowDraft(workflow: PresetWorkflow | undefined) {
  const { saveStages } = usePresetWorkflows();
  const values = useMemo<PresetWorkflowStagesFormValues>(
    () => ({
      stages: workflow
        ? orderedWorkflowSteps(workflow).map((step) => ({
            stepGuid: step.guid,
            presetGuid: step.presetGuid,
            isResortMode: step.isResortMode,
          }))
        : [],
    }),
    [workflow],
  );
  const form = useForm<PresetWorkflowStagesFormValues>({
    resolver: zodResolver(presetWorkflowStagesSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const stages = useFieldArray({
    control: form.control,
    name: "stages",
    keyName: "fieldKey",
  });

  const save = async (draft: PresetWorkflowStagesFormValues) => {
    if (!workflow) return;
    if (await saveStages(workflow, draft.stages)) {
      form.reset(draft);
    }
  };

  return {
    form,
    stages,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    save: () => void form.handleSubmit(save)(),
    discard: () => form.reset(values, DISCARD_RESET_OPTIONS),
    addStage: (presetGuid: string) =>
      stages.append({
        stepGuid: null,
        presetGuid,
        isResortMode: stages.fields.length > 0,
      }),
  };
}
