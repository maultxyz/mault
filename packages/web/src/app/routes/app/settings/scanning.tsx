import { PriceSourceToggle } from "@/components/price-source-toggle";
import { SaveBar } from "@/components/save-bar";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useOrgSettingsDraft } from "@/features/companies/api/use-org-settings-draft";
import { OcrToggle } from "@/features/scanner/components/ocr-toggle";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export default function SettingsScanningPage() {
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
        heading={t("sessionWrapped.heading")}
        description={t("sessionWrapped.description")}
      >
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("sessionWrapped.toggleLabel")}</span>
          <Controller
            control={draft.control}
            name="sessionWrappedEnabled"
            render={({ field }) => (
              <Switch
                checked={field.value}
                disabled={disabled}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </label>
      </SettingsSection>
      <SettingsSection
        heading={t("ocr.heading")}
        badge={<Badge variant="outline">{t("ocr.badge")}</Badge>}
        description={t("ocr.description")}
      >
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("ocr.toggleLabel")}</span>
          <Controller
            control={draft.control}
            name="ocrEnabled"
            render={({ field }) => (
              <OcrToggle
                checked={field.value}
                disabled={disabled}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </label>
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
