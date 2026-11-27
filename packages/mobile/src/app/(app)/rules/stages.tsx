import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { orderedWorkflowSteps, type PresetWorkflowStageInput, type PresetWorkflowStep } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import {
  deletePresetWorkflow,
  presetWorkflowsQueryOptions,
  savePresetWorkflowStages,
} from "@/features/rules/api/preset-workflows";
import { useActivePresetWorkflow } from "@/features/rules/api/use-active-preset-workflow";
import { usePresetStageMoves } from "@/features/rules/api/use-preset-stage-moves";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useActiveOrgId } from "@/hooks/use-org";
import type { PresetStagesRouteParams } from "@/lib/interfaces/rules";

export default function PresetStagesScreen() {
  const { t } = useTranslation();
  const { workflow: workflowParam } = useLocalSearchParams<PresetStagesRouteParams>();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { sets } = useRulesData();
  const active = useActivePresetWorkflow();
  const { step: activeStep, presetName, isPending, isError, isRefetching, refetch } = active;
  const workflow = workflowParam
    ? (active.workflows.find((candidate) => candidate.guid === workflowParam) ?? null)
    : active.workflow;
  const isRunning = !!workflow && workflow.guid === active.workflow?.guid;
  const moves = usePresetStageMoves();
  const [stageMenu, setStageMenu] = useState<PresetWorkflowStep | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const steps = workflow ? orderedWorkflowSteps(workflow) : [];
  const workflowsKey = presetWorkflowsQueryOptions(orgId).queryKey;

  const saveStages = useMutation({
    mutationFn: (stages: PresetWorkflowStageInput[]) => savePresetWorkflowStages(workflow?.guid ?? "", stages),
    onSuccess: (next) => queryClient.setQueryData(workflowsKey, next),
  });
  const remove = useMutation({
    mutationFn: () => deletePresetWorkflow(workflow?.guid ?? ""),
    onSuccess: (next) => {
      queryClient.setQueryData(workflowsKey, next);
      router.back();
    },
  });

  const stageInputs = (): PresetWorkflowStageInput[] =>
    steps.map((step) => ({ stepGuid: step.guid, presetGuid: step.presetGuid, isResortMode: step.isResortMode }));
  const moveStage = (step: PresetWorkflowStep, offset: number) => {
    const stages = stageInputs();
    const index = stages.findIndex((stage) => stage.stepGuid === step.guid);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= stages.length) return;
    [stages[index], stages[target]] = [stages[target], stages[index]];
    saveStages.mutate(stages);
  };

  const stageIndex = stageMenu ? steps.findIndex((step) => step.guid === stageMenu.guid) : -1;
  const stageOptions = stageMenu
    ? [
        ...(isRunning && stageMenu.guid !== activeStep?.guid ? [{ value: "switch", label: t("rules.stages.switchHere") }] : []),
        ...(stageIndex > 0 ? [{ value: "up", label: t("rules.stages.moveUp") }] : []),
        ...(stageIndex < steps.length - 1 ? [{ value: "down", label: t("rules.stages.moveDown") }] : []),
        ...(stageIndex > 0
          ? [
              {
                value: "resort",
                label: stageMenu.isResortMode ? t("rules.stages.resortOff") : t("rules.stages.resortOn"),
              },
            ]
          : []),
        ...(steps.length > 1 && stageMenu.guid !== activeStep?.guid
          ? [{ value: "remove", label: t("rules.stages.removeStage") }]
          : []),
      ]
    : [];
  const runStageAction = (action: string) => {
    const step = stageMenu;
    setStageMenu(null);
    if (!step || !workflow) return;
    if (action === "switch") moves.moveTo(workflow, step, presetName(step.presetGuid));
    else if (action === "up") moveStage(step, -1);
    else if (action === "down") moveStage(step, 1);
    else if (action === "resort") {
      saveStages.mutate(
        stageInputs().map((stage) =>
          stage.stepGuid === step.guid ? { ...stage, isResortMode: !stage.isResortMode } : stage,
        ),
      );
    } else if (action === "remove") {
      Alert.alert(
        t("rules.stages.removeStageTitle"),
        t("rules.stages.removeStageDescription", { name: presetName(step.presetGuid) }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("rules.stages.removeStage"),
            style: "destructive",
            onPress: () => saveStages.mutate(stageInputs().filter((stage) => stage.stepGuid !== step.guid)),
          },
        ],
      );
    }
  };

  const runMenuAction = (action: string) => {
    setMenuOpen(false);
    if (!workflow) return;
    if (action === "rename") {
      router.push({ pathname: "/preset-description", params: { mode: "workflowRename", guid: workflow.guid } });
    } else if (action === "delete") {
      Alert.alert(t("rules.stages.deleteTitle"), t("rules.stages.deleteDescription", { name: workflow.name }), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("rules.presetMenu.deleteConfirm"), style: "destructive", onPress: () => remove.mutate() },
      ]);
    }
  };

  return (
    <Screen
      header={
        <PageHeader
          title={t("rules.stages.pageTitle")}
          subtitle={workflow?.name}
          onBack={() => router.back()}
          actions={
            workflow ? (
              <IconButton icon="more" accessibilityLabel={t("rules.stages.actions")} onPress={() => setMenuOpen(true)} />
            ) : null
          }
        />
      }
    >
      <AppText size="sm" tone="secondary">
        {t("rules.stages.pageDescription")}
      </AppText>
      {moves.isError ? <Callout tone="destructive" title={t("rules.stages.switchFailed")} /> : null}
      {saveStages.isError || remove.isError ? <Callout tone="destructive" title={t("rules.stages.saveFailed")} /> : null}
      {isError && !workflow ? (
        <QueryErrorState title={t("rules.loadFailed")} onRetry={() => void refetch()} isRetrying={isRefetching} />
      ) : isPending ? (
        <ListSkeleton leading="none" hasSubtitle />
      ) : workflow ? (
        <>
          <ListGroup>
            {steps.map((step, index) => {
              const isCurrent = isRunning && step.guid === activeStep?.guid;
              return (
                <ListRow
                  key={step.guid}
                  title={presetName(step.presetGuid)}
                  subtitle={[
                    t("rules.stages.stageHeading", { number: index + 1 }),
                    index > 0 && step.isResortMode ? t("rules.stages.resort") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  value={isCurrent ? t("rules.stages.current") : undefined}
                  selected={isCurrent}
                  disabled={moves.isPending || saveStages.isPending}
                  accessibilityHint={t("rules.stages.stageActionsHint")}
                  onPress={() => setStageMenu(step)}
                />
              );
            })}
          </ListGroup>
          <Button
            variant="secondary"
            icon="plus"
            label={t("rules.stages.addStage")}
            loading={saveStages.isPending}
            disabled={sets.length === 0}
            onPress={() => setAddOpen(true)}
          />
        </>
      ) : (
        <EmptyState icon="rules" title={t("rules.stages.noWorkflowTitle")} description={t("rules.stages.noWorkflowDescription")} />
      )}
      <OptionSheet
        visible={!!stageMenu && stageOptions.length > 0}
        title={stageMenu ? presetName(stageMenu.presetGuid) : ""}
        options={stageOptions}
        selected={[]}
        onSelect={runStageAction}
        onClose={() => setStageMenu(null)}
      />
      <OptionSheet
        visible={addOpen}
        title={t("rules.stages.addStage")}
        options={sets.map((preset) => ({ value: preset.guid, label: preset.name }))}
        selected={[]}
        onSelect={(presetGuid) => {
          setAddOpen(false);
          saveStages.mutate([...stageInputs(), { stepGuid: null, presetGuid, isResortMode: steps.length > 0 }]);
        }}
        onClose={() => setAddOpen(false)}
      />
      <OptionSheet
        visible={menuOpen}
        title={workflow?.name ?? t("rules.stages.actions")}
        options={[
          { value: "rename", label: t("rules.stages.rename") },
          { value: "delete", label: t("rules.stages.delete") },
        ]}
        selected={[]}
        onSelect={runMenuAction}
        onClose={() => setMenuOpen(false)}
      />
    </Screen>
  );
}
