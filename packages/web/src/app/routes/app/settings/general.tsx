import { LanguageSwitcher } from "@/components/language-switcher";
import { PrimaryColorPicker } from "@/components/primary-color-picker";
import { SaveBar } from "@/components/save-bar";
import { ScannerLayoutToggle } from "@/components/scanner-layout-toggle";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useOrgSettingsDraft } from "@/features/companies/api/use-org-settings-draft";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export default function SettingsGeneralPage() {
  const { t } = useTranslation("settings");
  const isMobile = useIsMobile();
  const draft = useOrgSettingsDraft();

  return (
    <SettingsSections>
      <SettingsSection
        heading={t("appearance.heading")}
        description={t("appearance.description")}
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">{t("appearance.primaryColor")}</p>
          <Controller
            control={draft.control}
            name="primaryColor"
            render={({ field }) => (
              <PrimaryColorPicker
                value={field.value}
                savedValue={draft.savedPrimaryColor}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        {!isMobile && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">
              {t("appearance.scannerLayout")}
            </p>
            <Controller
              control={draft.control}
              name="scannerLayout"
              render={({ field }) => (
                <ScannerLayoutToggle
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        )}
      </SettingsSection>
      <SettingsSection heading={t("appearance.language")}>
        <LanguageSwitcher />
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
