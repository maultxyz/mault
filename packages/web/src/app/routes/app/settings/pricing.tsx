import { ConditionMultipliersSetting } from "@/components/condition-multipliers-setting";
import { PriceSourceToggle } from "@/components/price-source-toggle";
import { SaveBar } from "@/components/save-bar";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useOrgSettingsDraft } from "@/features/companies/api/use-org-settings-draft";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export default function SettingsPricingPage() {
  const { t } = useTranslation("settings");
  const draft = useOrgSettingsDraft();
  const disabled = draft.isLoading || draft.isSaving;

  return (
    <SettingsSections>
      <SettingsSection
        heading={t("pricing.heading")}
        description={t("pricing.description")}
      >
        <Controller
          control={draft.control}
          name="priceSource"
          render={({ field }) => (
            <PriceSourceToggle value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsSection>
      <SettingsSection
        heading={t("conditionPricing.heading")}
        description={t("conditionPricing.description")}
      >
        <Controller
          control={draft.control}
          name="conditionMultipliers"
          render={({ field, fieldState }) => (
            <ConditionMultipliersSetting
              value={field.value}
              disabled={disabled}
              errors={[fieldState.error]}
              onChange={field.onChange}
            />
          )}
        />
      </SettingsSection>
      <SaveBar
        show={draft.isDirty}
        isSaving={draft.isSaving}
        onSave={draft.save}
        onDiscard={draft.discard}
      />
      <UnsavedChangesGuard isDirty={draft.isDirty} onDiscard={draft.discard} />
    </SettingsSections>
  );
}
