import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { orderedWorkflowSteps } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { useActivePresetWorkflow } from "@/features/rules/api/use-active-preset-workflow";
import { usePresetStageMoves } from "@/features/rules/api/use-preset-stage-moves";

export default function PresetStagesScreen() {
  const { t } = useTranslation();
  const { workflow, step: activeStep, presetName, isPending, isError, isRefetching, refetch } = useActivePresetWorkflow();
  const moves = usePresetStageMoves();

  return (
    <Screen header={<PageHeader title={t("rules.stages.pageTitle")} subtitle={workflow?.name} onBack={() => router.back()} />}>
      <AppText size="sm" tone="secondary">
        {t("rules.stages.pageDescription")}
      </AppText>
      {moves.isError ? <Callout tone="destructive" title={t("rules.stages.switchFailed")} /> : null}
      {isError && !workflow ? (
        <QueryErrorState title={t("rules.loadFailed")} onRetry={() => void refetch()} isRetrying={isRefetching} />
      ) : isPending ? (
        <ListSkeleton />
      ) : workflow ? (
        <ListGroup>
          {orderedWorkflowSteps(workflow).map((step, index) => {
            const isCurrent = step.guid === activeStep?.guid;
            return (
              <ListRow
                key={step.guid}
                title={presetName(step.presetGuid)}
                subtitle={[
                  t("rules.stages.stageHeading", { number: index + 1 }),
                  index > 0 && step.isResortMode ? t("rules.stages.resort") : null,
                ]
                  .filter(Boolean)
                  .join(" \u00b7 ")}
                value={isCurrent ? t("rules.stages.current") : undefined}
                selected={isCurrent}
                disabled={isCurrent || moves.isPending}
                onPress={() => moves.moveTo(workflow, step, presetName(step.presetGuid))}
              />
            );
          })}
        </ListGroup>
      ) : (
        <EmptyState icon="rules" title={t("rules.stages.noWorkflowTitle")} description={t("rules.stages.noWorkflowDescription")} />
      )}
    </Screen>
  );
}
