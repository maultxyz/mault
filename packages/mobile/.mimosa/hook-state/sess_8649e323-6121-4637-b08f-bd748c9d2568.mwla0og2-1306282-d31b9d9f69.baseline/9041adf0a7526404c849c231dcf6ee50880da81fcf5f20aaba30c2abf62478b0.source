import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import type { PresetWorkflow, PresetWorkflowStep } from "@magic-vault/shared";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { enterPresetWorkflowStep, presetWorkflowsQueryOptions } from "@/features/rules/api/preset-workflows";
import { useActiveOrgId } from "@/hooks/use-org";
import type { PresetStageMoves } from "@/lib/interfaces/rules";

export function usePresetStageMoves(): PresetStageMoves {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();

  const enter = useMutation({
    mutationFn: ({
      workflow,
      step,
      markBinsEmptied,
    }: {
      workflow: PresetWorkflow;
      step: PresetWorkflowStep;
      markBinsEmptied: boolean;
    }) => enterPresetWorkflowStep(workflow.guid, step.guid, markBinsEmptied),
    onSuccess: (next) => {
      queryClient.setQueryData(presetWorkflowsQueryOptions(orgId).queryKey, next.workflows);
      queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next.presets);
    },
  });

  return {
    moveTo: (workflow, step, name) =>
      Alert.alert(t("rules.stages.confirmMoveTitle", { name }), t("rules.stages.confirmMoveDescription", { name }), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("rules.stages.confirm"), onPress: () => enter.mutate({ workflow, step, markBinsEmptied: true }) },
      ]),
    start: (workflow, step) => enter.mutate({ workflow, step, markBinsEmptied: false }),
    isPending: enter.isPending,
    isError: enter.isError,
  };
}
