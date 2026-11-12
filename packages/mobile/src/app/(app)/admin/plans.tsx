import { router, useNavigation, usePreventRemove } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { PLAN_KEYS, PLAN_LIMIT_KEYS, type PlanKey } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { usePlanSettingsDraft } from "@/features/admin/api/plans-settings-draft";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { PlansFeatureRows } from "@/features/admin/components/plans-feature-rows";
import { PlansLimitRow } from "@/features/admin/components/plans-limit-row";
import { PlansPreviewSection } from "@/features/admin/components/plans-preview-section";
import { PlansPricingModeSection } from "@/features/admin/components/plans-pricing-mode-section";
import { PLAN_LIMIT_FALLBACK } from "@/lib/constants/admin-plans";
import { SPACING } from "@/lib/constants/theme";

function PlanSettingsEditor() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [editedPlan, setEditedPlan] = useState<PlanKey>(PLAN_KEYS[0]);
  const draft = usePlanSettingsDraft({ onValidationFailedForPlan: setEditedPlan });
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const planName = (plan: string) => t(`settings.billing.plan.${plan}`);

  usePreventRemove(draft.isDirty && !draft.isSaving, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("admin.plans.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => {
          draft.discard();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <PageHeader title={t("admin.sections.plans.title")} subtitle={t("admin.plans.subtitle")} onBack={() => router.back()} />
        }
      >
        {draft.isLoading ? (
          <PageSkeleton />
        ) : draft.isLoadError || !draft.data ? (
          <Callout tone="destructive" title={t("admin.plans.loadFailed")} />
        ) : (
          <>
            <PlansPricingModeSection />
            <PlansPreviewSection />
            {!draft.data.billingEnabled ? <Callout tone="info" title={t("admin.plans.billingDisabled")} /> : null}
            {draft.saveError ? <Callout tone="destructive" title={t("admin.plans.saveFailed")} /> : null}
            <Surface style={{ gap: SPACING.md }}>
              <View style={{ gap: SPACING.xs }}>
                <AppText heading weight="semibold" accessibilityRole="header">
                  {t("admin.plans.editorHeading")}
                </AppText>
                <AppText size="xs" tone="secondary">
                  {t("admin.plans.editorDescription")}
                </AppText>
              </View>
              <SelectField
                label={t("admin.plans.editedPlanLabel")}
                value={planName(editedPlan)}
                placeholder={planName(editedPlan)}
                onPress={() => setIsPlanSheetOpen(true)}
              />
              <Button
                variant="secondary"
                icon="restore"
                label={t("admin.plans.restoreDefaults")}
                accessibilityHint={t("admin.plans.restoreDefaultsHint")}
                disabled={draft.isSaving}
                onPress={draft.restoreDefaults}
              />
            </Surface>
            <Surface style={{ gap: SPACING.md }}>
              <View style={{ gap: SPACING.xs }}>
                <AppText heading weight="semibold" accessibilityRole="header">
                  {t("admin.plans.featuresHeading", { plan: planName(editedPlan) })}
                </AppText>
                <AppText size="xs" tone="secondary">
                  {t("admin.plans.featuresDescription")}
                </AppText>
              </View>
              <PlansFeatureRows key={editedPlan} plan={editedPlan} control={draft.control} disabled={draft.isSaving} />
            </Surface>
            <Surface style={{ gap: SPACING.lg }}>
              <View style={{ gap: SPACING.xs }}>
                <AppText heading weight="semibold" accessibilityRole="header">
                  {t("admin.plans.limitsHeading", { plan: planName(editedPlan) })}
                </AppText>
                <AppText size="xs" tone="secondary">
                  {t("admin.plans.limitsDescription")}
                </AppText>
              </View>
              {PLAN_LIMIT_KEYS.map((limit) => (
                <PlansLimitRow
                  key={`${editedPlan}-${limit}`}
                  plan={editedPlan}
                  limit={limit}
                  control={draft.control}
                  fallbackLimit={draft.data?.defaults[editedPlan].limits[limit] ?? PLAN_LIMIT_FALLBACK}
                  disabled={draft.isSaving}
                />
              ))}
            </Surface>
            <OptionSheet
              visible={isPlanSheetOpen}
              title={t("admin.plans.editedPlanLabel")}
              options={PLAN_KEYS.map((plan) => ({ value: plan, label: planName(plan) }))}
              selected={[editedPlan]}
              onSelect={(value) => {
                setEditedPlan(PLAN_KEYS.find((plan) => plan === value) ?? editedPlan);
                setIsPlanSheetOpen(false);
              }}
              onClose={() => setIsPlanSheetOpen(false)}
            />
          </>
        )}
      </Screen>
      <SaveBar visible={draft.isDirty} saving={draft.isSaving} onSave={draft.save} onDiscard={draft.discard} />
    </View>
  );
}

export default function AdminPlansScreen() {
  return (
    <AdminGate requiresPlatformAdmin>
      <PlanSettingsEditor />
    </AdminGate>
  );
}
