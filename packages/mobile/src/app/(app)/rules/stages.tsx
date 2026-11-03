import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { orderedWorkflowSteps } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { useActivePresetWorkflow } from "@/features/rules/api/use-active-preset-workflow";
import { usePresetStageMoves } from "@/features/rules/api/use-preset-stage-moves";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function PresetStagesScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { workflow, step: activeStep, presetName } = useActivePresetWorkflow();
  const moves = usePresetStageMoves();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("rules.stages.pageTitle")} subtitle={workflow?.name} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: SCREEN_GUTTER,
          paddingBottom: SPACING.xxl * 2,
          gap: SPACING.xl,
        }}
      >
        <AppText size="sm" tone="secondary">
          {t("rules.stages.pageDescription")}
        </AppText>
        {moves.isError ? <Callout tone="destructive" title={t("rules.stages.switchFailed")} /> : null}
        {workflow ? (
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
      </ScrollView>
    </View>
  );
}
