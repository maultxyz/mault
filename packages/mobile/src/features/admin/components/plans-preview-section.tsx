import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PLAN_KEYS } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { usePlanPreview } from "@/features/admin/api/plans-preview";
import { PLAN_PREVIEW_OFF_VALUE } from "@/lib/constants/admin-plans";
import { SPACING } from "@/lib/constants/theme";
import { SettingsSection } from "@/features/settings/components/settings-section";

export function PlansPreviewSection() {
  const { t } = useTranslation();
  const { previewPlan, changePreviewPlan } = usePlanPreview();
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const selectedValue = previewPlan ?? PLAN_PREVIEW_OFF_VALUE;
  const labelForPreviewValue = (value: string) =>
    value === PLAN_PREVIEW_OFF_VALUE ? t("admin.plans.preview.off") : t(`settings.billing.plan.${value}`);

  return (
    <SettingsSection title={t("admin.plans.preview.heading")} description={t("admin.plans.preview.description")}>
      <Surface style={{ gap: SPACING.md }}>
        <SelectField
          label={t("admin.plans.preview.selectLabel")}
          value={labelForPreviewValue(selectedValue)}
          placeholder={t("admin.plans.preview.off")}
          onPress={() => setIsPlanSheetOpen(true)}
        />
        {previewPlan ? (
          <Callout
            tone="info"
            title={t("admin.plans.preview.activeTitle", { plan: labelForPreviewValue(previewPlan) })}
            description={t("admin.plans.preview.activeDescription")}
            action={
              <Button size="sm" variant="secondary" label={t("admin.plans.preview.stop")} onPress={() => changePreviewPlan(null)} />
            }
          />
        ) : null}
        <OptionSheet
          visible={isPlanSheetOpen}
          title={t("admin.plans.preview.selectLabel")}
          options={[PLAN_PREVIEW_OFF_VALUE, ...PLAN_KEYS].map((value) => ({ value, label: labelForPreviewValue(value) }))}
          selected={[selectedValue]}
          onSelect={(value) => {
            changePreviewPlan(PLAN_KEYS.find((plan) => plan === value) ?? null);
            setIsPlanSheetOpen(false);
          }}
          onClose={() => setIsPlanSheetOpen(false)}
        />
      </Surface>
    </SettingsSection>
  );
}
