import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { SectionHeader } from "@/components/ui/section-header";
import { useActivePresetWorkflow } from "@/features/rules/api/use-active-preset-workflow";
import { usePresetStageMoves } from "@/features/rules/api/use-preset-stage-moves";
import { SPACING } from "@/lib/constants/theme";

export function PresetStageCard() {
  const { t } = useTranslation();
  const moves = usePresetStageMoves();
  const { workflow, stageNumber, stageCount, previousStep, nextStep, label, presetName } =
    useActivePresetWorkflow();

  if (!workflow) return null;

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={{ gap: 2 }}>
        <SectionHeader
          title={t("rules.stages.stageOf", { number: stageNumber, count: stageCount })}
          action={
            <Button
              variant="ghost"
              size="sm"
              label={t("rules.stages.viewStages")}
              onPress={() => router.push("/rules/stages")}
            />
          }
        />
        <AppText size="sm" tone="secondary">
          {label}
        </AppText>
      </View>
      {moves.isError ? <Callout tone="destructive" title={t("rules.stages.switchFailed")} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {previousStep ? (
          <Button
            variant="secondary"
            icon="arrowLeft"
            label={t("rules.stages.previousStage")}
            disabled={moves.isPending}
            onPress={() => moves.moveTo(workflow, previousStep, presetName(previousStep.presetGuid))}
          />
        ) : null}
        {nextStep ? (
          <Button
            variant="primary"
            icon="arrowRight"
            label={t("rules.stages.nextStage")}
            loading={moves.isPending}
            onPress={() => moves.moveTo(workflow, nextStep, presetName(nextStep.presetGuid))}
          />
        ) : (
          <AppText size="sm" tone="secondary">
            {t("rules.stages.lastStage")}
          </AppText>
        )}
      </View>
    </View>
  );
}
