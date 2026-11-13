import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS, DEFAULT_CORRECTION_AUTO_CLOSE_SECONDS } from "@magic-vault/shared";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { useOrgSettingsDraft } from "@/features/settings/api/use-org-settings-draft";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { SPACING } from "@/lib/constants/theme";

export default function ScanningSettingsScreen() {
  const { t } = useTranslation();
  const draft = useOrgSettingsDraft();
  const disabled = draft.isLoading || draft.isSaving;
  const correctionBinPrompt = useWatch({ control: draft.control, name: "correctionBinPrompt" });
  const ocrEnabled = useWatch({ control: draft.control, name: "ocrEnabled" });
  const [secondsOpen, setSecondsOpen] = useState(false);

  return (
    <SettingsPage
      title={t("settings.sections.scanning.title")}
      isLoading={draft.isLoading}
      isDirty={draft.isDirty}
      isSaving={draft.isSaving}
      saveError={draft.saveError}
      onSave={draft.save}
      onDiscard={draft.discard}
    >
      <SettingsSection title={t("settings.sessionWrapped.heading")} description={t("settings.sessionWrapped.description")}>
        <Controller
          control={draft.control}
          name="sessionWrappedEnabled"
          render={({ field }) => (
            <SwitchRow title={t("settings.sessionWrapped.toggleLabel")} value={field.value} disabled={disabled} onValueChange={field.onChange} />
          )}
        />
      </SettingsSection>
      <SettingsSection title={t("settings.ocr.heading")} description={t("settings.ocr.description")}>
        <Controller
          control={draft.control}
          name="ocrEnabled"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.ocr.toggleLabel")}
              value={field.value}
              disabled={disabled}
              onValueChange={field.onChange}
            />
          )}
        />
        <Controller
          control={draft.control}
          name="highAccuracyScans"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.ocr.highAccuracyToggleLabel")}
              description={t("settings.ocr.highAccuracyDescription")}
              value={field.value}
              disabled={disabled || !ocrEnabled}
              onValueChange={field.onChange}
            />
          )}
        />
      </SettingsSection>
      <SettingsSection title={t("settings.foilDetection.heading")} description={t("settings.foilDetection.description")}>
        <Controller
          control={draft.control}
          name="foilStarDetectionEnabled"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.foilDetection.starToggleLabel")}
              description={t("settings.foilDetection.starToggleDescription")}
              value={field.value}
              disabled={disabled}
              onValueChange={field.onChange}
            />
          )}
        />
      </SettingsSection>
      <SettingsSection title={t("settings.correctionAutoClose.heading")} description={t("settings.correctionAutoClose.description")}>
        <Controller
          control={draft.control}
          name="correctionBinPrompt"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.correctionAutoClose.promptToggleLabel")}
              description={t("settings.correctionAutoClose.promptToggleDescription")}
              value={field.value}
              disabled={disabled}
              onValueChange={field.onChange}
            />
          )}
        />
        {correctionBinPrompt ? (
          <Controller
            control={draft.control}
            name="correctionAutoCloseSeconds"
            render={({ field }) => (
              <View style={{ gap: SPACING.sm }}>
                <SwitchRow
                  title={t("settings.correctionAutoClose.toggleLabel")}
                  value={field.value != null}
                  disabled={disabled}
                  onValueChange={(next) => field.onChange(next ? DEFAULT_CORRECTION_AUTO_CLOSE_SECONDS : null)}
                />
                {field.value != null ? (
                  <SelectField
                    label={t("settings.correctionAutoClose.secondsLabel")}
                    value={t("settings.correctionAutoClose.seconds", { count: field.value })}
                    placeholder={t("settings.correctionAutoClose.secondsLabel")}
                    disabled={disabled}
                    onPress={() => setSecondsOpen(true)}
                  />
                ) : null}
                <OptionSheet
                  visible={secondsOpen}
                  title={t("settings.correctionAutoClose.secondsLabel")}
                  options={CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS.map((seconds) => ({
                    value: String(seconds),
                    label: t("settings.correctionAutoClose.seconds", { count: seconds }),
                  }))}
                  selected={field.value != null ? [String(field.value)] : []}
                  onSelect={(value) => {
                    setSecondsOpen(false);
                    field.onChange(Number(value));
                  }}
                  onClose={() => setSecondsOpen(false)}
                />
              </View>
            )}
          />
        ) : null}
      </SettingsSection>
      <SettingsSection title={t("settings.deployPause.heading")} description={t("settings.deployPause.description")}>
        <Controller
          control={draft.control}
          name="pauseScanningOnDeploy"
          render={({ field }) => (
            <SwitchRow title={t("settings.deployPause.toggleLabel")} value={field.value} disabled={disabled} onValueChange={field.onChange} />
          )}
        />
      </SettingsSection>
    </SettingsPage>
  );
}
